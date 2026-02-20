import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GameReplayData, ReplayPitchEvent, ReplayVector3 } from '../types';

interface PitchReplayViewerProps {
  replay: GameReplayData;
  /** Lookup map of player ID → player name */
  playerNames: Map<string, string>;
  homeTeamName: string;
  awayTeamName: string;
}

// --- Pitch type color palette -----------------------------------------
const PITCH_COLORS: Record<string, string> = {
  Fastball:  '#ef4444', // red
  Sinker:    '#f97316', // orange
  Slider:    '#eab308', // yellow
  Curveball: '#22c55e', // green
  Cutter:    '#3b82f6', // blue
  Changeup:  '#a855f7', // purple
  Splitter:  '#06b6d4', // cyan
};
const pitchColor = (type: string) => PITCH_COLORS[type] ?? '#94a3b8';

// --- Pitch result shorthand -------------------------------------------
const pitchResultShort = (r: string): string => {
  if (r === 'Ball') return 'B';
  if (r === 'Called Strike') return 'C';
  if (r === 'Swinging Strike') return 'S';
  if (r === 'Foul') return 'F';
  if (r === 'In Play') return 'X';
  if (r === 'Hit By Pitch') return 'H';
  return r.charAt(0);
};

// --- Strike zone constants (in feet, centered at x=0) -----------------
// MLB strike zone: ~17 in wide (.708 ft each side), ~1.5 to 3.5 ft high
const SZ = { left: -0.71, right: 0.71, bottom: 1.50, top: 3.50 };

// --- SVG coordinate mapping helpers -----------------------------------
const mapToSVG = (
  val: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number => outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin);

// Map plate coords {x, y} → SVG pixel {px, py} in a strike-zone canvas
// SVG: (0,0) top-left; we render 400×380 internal units
const szW = 400, szH = 380;
const szPad = 60;
const plateCoordsToSVG = (fx: number, fy: number) => ({
  px: mapToSVG(fx, -1.4, 1.4, szPad, szW - szPad),
  py: mapToSVG(fy, 4.2, 0.8, szPad, szH - szPad),   // y flipped (higher = lower in SVG)
});

// Strike zone box in SVG coords
const szBox = {
  x: mapToSVG(SZ.left,  -1.4, 1.4, szPad, szW - szPad),
  y: mapToSVG(SZ.top,    4.2, 0.8, szPad, szH - szPad),
  w: mapToSVG(SZ.right,  -1.4, 1.4, szPad, szW - szPad) - mapToSVG(SZ.left, -1.4, 1.4, szPad, szW - szPad),
  h: mapToSVG(SZ.bottom, 4.2, 0.8, szPad, szH - szPad) - mapToSVG(SZ.top,   4.2, 0.8, szPad, szH - szPad),
};

// --- 3D trajectory canvas constants -----------------------------------
// Side view: z (depth 54→0 mapped left→right) vs y (height)
// Top view:  z (depth 54→0 left→right)  vs x (horizontal)
const TRAJ_W = 380, TRAJ_H = 200;
const TRAJ_PAD = 30;

const projectSide = (pt: ReplayVector3) => ({
  px: mapToSVG(pt.z, 56, 0, TRAJ_PAD, TRAJ_W - TRAJ_PAD),  // z = distance
  py: mapToSVG(pt.y, 7.5, 0.5, TRAJ_PAD, TRAJ_H - TRAJ_PAD), // y = height
});
const projectTop = (pt: ReplayVector3) => ({
  px: mapToSVG(pt.z, 56, 0, TRAJ_PAD, TRAJ_W - TRAJ_PAD),
  py: mapToSVG(pt.x, -1.2, 1.2, TRAJ_PAD, TRAJ_H - TRAJ_PAD),
});

// --- polyline string from point array ---------------------------------
const toPolyline = (pts: { px: number; py: number }[]) =>
  pts.map(p => `${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(' ');

// ======================================================================
// Sub-component: Strike zone spray chart (2D catcher view)
// ======================================================================
const StrikeZoneChart: React.FC<{
  pitches: ReplayPitchEvent[];
  selected: number | null;
  onSelect: (idx: number) => void;
  filterType: string;
}> = ({ pitches, selected, onSelect, filterType }) => {
  return (
    <svg
      viewBox={`0 0 ${szW} ${szH}`}
      className="w-full max-w-xs mx-auto"
      aria-label="Strike Zone Spray Chart"
    >
      {/* Background */}
      <rect x="0" y="0" width={szW} height={szH} fill="#0f172a" rx="8" />

      {/* Labels */}
      <text x={szW / 2} y="22" textAnchor="middle" fill="#64748b" fontSize="13" fontFamily="monospace">
        Catcher View (Batter's Perspective)
      </text>

      {/* Strike zone box - outer half */}
      <rect
        x={szBox.x - szBox.w * 0.25}
        y={szBox.y - szBox.h * 0.15}
        width={szBox.w * 1.5}
        height={szBox.h * 1.3}
        fill="none"
        stroke="#334155"
        strokeWidth="1"
        strokeDasharray="4 4"
      />

      {/* Strike zone box */}
      <rect
        x={szBox.x}
        y={szBox.y}
        width={szBox.w}
        height={szBox.h}
        fill="#1e293b"
        stroke="#475569"
        strokeWidth="1.5"
      />

      {/* Strike zone thirds - horizontal lines */}
      {[1 / 3, 2 / 3].map((frac) => (
        <line
          key={frac}
          x1={szBox.x}
          y1={szBox.y + szBox.h * frac}
          x2={szBox.x + szBox.w}
          y2={szBox.y + szBox.h * frac}
          stroke="#334155"
          strokeWidth="0.8"
        />
      ))}
      {/* Strike zone thirds - vertical lines */}
      {[1 / 3, 2 / 3].map((frac) => (
        <line
          key={frac}
          x1={szBox.x + szBox.w * frac}
          y1={szBox.y}
          x2={szBox.x + szBox.w * frac}
          y2={szBox.y + szBox.h}
          stroke="#334155"
          strokeWidth="0.8"
        />
      ))}

      {/* Home plate shape */}
      {(() => {
        const cx = szW / 2;
        const by = szH - 20;
        const pts = [
          [cx - 18, by - 10], [cx + 18, by - 10],
          [cx + 18, by],      [cx,       by + 10],
          [cx - 18, by],
        ].map(([x, y]) => `${x},${y}`).join(' ');
        return <polygon points={pts} fill="#1e293b" stroke="#475569" strokeWidth="1.5" />;
      })()}

      {/* Axis labels */}
      <text x={szW / 2} y={szH - 4} textAnchor="middle" fill="#475569" fontSize="11" fontFamily="monospace">
        Home Plate
      </text>
      <text x="14" y={szBox.y + szBox.h * 0.5} textAnchor="middle" fill="#475569" fontSize="11" fontFamily="monospace"
        transform={`rotate(-90, 14, ${szBox.y + szBox.h * 0.5})`}>
        Height (ft)
      </text>

      {/* Pitch dots */}
      {pitches.map((p, i) => {
        if (filterType !== 'all' && p.pitchType !== filterType) return null;
        const { px, py } = plateCoordsToSVG(p.platePoint.x, p.platePoint.y);
        const isSelected = selected === i;
        const isStrike = ['Called Strike', 'Swinging Strike', 'Foul', 'In Play'].includes(p.result);
        const color = pitchColor(p.pitchType);
        return (
          <g key={i} onClick={() => onSelect(i)} style={{ cursor: 'pointer' }}>
            {isSelected && (
              <circle cx={px} cy={py} r="13" fill={color} opacity="0.25" />
            )}
            <circle
              cx={px}
              cy={py}
              r={isSelected ? 8 : 6}
              fill={color}
              stroke={isStrike ? '#ffffff' : '#0f172a'}
              strokeWidth={isSelected ? 2 : 1}
              opacity={isSelected ? 1 : 0.85}
            />
            {/* Result letter */}
            <text
              x={px}
              y={py + 4}
              textAnchor="middle"
              fill="#ffffff"
              fontSize={isSelected ? '8' : '7'}
              fontFamily="monospace"
              fontWeight="bold"
              pointerEvents="none"
            >
              {pitchResultShort(p.result)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ======================================================================
// Sub-component: 3D trajectory viewer (side + top views)
// ======================================================================
const TrajectoryView: React.FC<{ pitch: ReplayPitchEvent }> = ({ pitch }) => {
  const { ballPath, releasePoint, platePoint } = pitch;
  const color = pitchColor(pitch.pitchType);
  const sidePoints = ballPath.map(projectSide);
  const topPoints  = ballPath.map(projectTop);
  const sideRelease = projectSide(releasePoint);
  const sidePlate   = projectSide(platePoint);
  const topRelease  = projectTop(releasePoint);
  const topPlate    = projectTop(platePoint);

  const gradientId = `traj-grad-${pitch.pitchType.replace(/\s/g, '')}`;

  return (
    <div className="space-y-3">
      {/* Side view: shows rise/drop */}
      <div>
        <p className="text-xs text-slate-500 uppercase font-mono mb-1">Side View — Height Profile</p>
        <svg viewBox={`0 0 ${TRAJ_W} ${TRAJ_H}`} className="w-full rounded bg-slate-950 border border-slate-800">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor={color} stopOpacity="0.5" />
              <stop offset="100%" stopColor={color} stopOpacity="1.0" />
            </linearGradient>
          </defs>
          {/* Mound marker */}
          <line x1={TRAJ_PAD} y1={TRAJ_H - TRAJ_PAD} x2={TRAJ_PAD} y2={TRAJ_PAD}
            stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
          {/* Plate marker */}
          <line x1={TRAJ_W - TRAJ_PAD} y1={TRAJ_H - TRAJ_PAD} x2={TRAJ_W - TRAJ_PAD} y2={TRAJ_PAD}
            stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
          {/* Strike zone height range */}
          <rect
            x={TRAJ_W - TRAJ_PAD - 6}
            y={mapToSVG(SZ.top,    7.5, 0.5, TRAJ_PAD, TRAJ_H - TRAJ_PAD)}
            width={12}
            height={mapToSVG(SZ.bottom, 7.5, 0.5, TRAJ_PAD, TRAJ_H - TRAJ_PAD) - mapToSVG(SZ.top, 7.5, 0.5, TRAJ_PAD, TRAJ_H - TRAJ_PAD)}
            fill="#1e3a5f"
            stroke="#3b82f6"
            strokeWidth="1"
          />
          {/* Ground line */}
          <line x1={TRAJ_PAD} y1={mapToSVG(0, 7.5, 0.5, TRAJ_PAD, TRAJ_H - TRAJ_PAD)}
            x2={TRAJ_W - TRAJ_PAD} y2={mapToSVG(0, 7.5, 0.5, TRAJ_PAD, TRAJ_H - TRAJ_PAD)}
            stroke="#334155" strokeWidth="1" />
          {/* Ball trajectory */}
          <polyline
            points={toPolyline(sidePoints)}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Release & plate dots */}
          <circle cx={sideRelease.px} cy={sideRelease.py} r="5" fill={color} opacity="0.6" />
          <circle cx={sidePlate.px}   cy={sidePlate.py}   r="6" fill={color} stroke="#fff" strokeWidth="1.5" />
          {/* Labels */}
          <text x={TRAJ_PAD}           y={TRAJ_H - 6} textAnchor="middle" fill="#475569" fontSize="10" fontFamily="monospace">Pitcher</text>
          <text x={TRAJ_W - TRAJ_PAD} y={TRAJ_H - 6} textAnchor="middle" fill="#475569" fontSize="10" fontFamily="monospace">Plate</text>
        </svg>
      </div>

      {/* Top view: shows horizontal break */}
      <div>
        <p className="text-xs text-slate-500 uppercase font-mono mb-1">Top View — Horizontal Break</p>
        <svg viewBox={`0 0 ${TRAJ_W} ${TRAJ_H}`} className="w-full rounded bg-slate-950 border border-slate-800">
          {/* Center line (for reference) */}
          <line x1={TRAJ_PAD} y1={TRAJ_H / 2} x2={TRAJ_W - TRAJ_PAD} y2={TRAJ_H / 2}
            stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
          {/* Strike zone width range at plate */}
          <rect
            x={TRAJ_W - TRAJ_PAD - 6}
            y={mapToSVG(SZ.right, -1.2, 1.2, TRAJ_PAD, TRAJ_H - TRAJ_PAD)}
            width={12}
            height={mapToSVG(SZ.left, -1.2, 1.2, TRAJ_PAD, TRAJ_H - TRAJ_PAD) - mapToSVG(SZ.right, -1.2, 1.2, TRAJ_PAD, TRAJ_H - TRAJ_PAD)}
            fill="#1e3a5f"
            stroke="#3b82f6"
            strokeWidth="1"
          />
          <polyline
            points={toPolyline(topPoints)}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={topRelease.px} cy={topRelease.py} r="5" fill={color} opacity="0.6" />
          <circle cx={topPlate.px}   cy={topPlate.py}   r="6" fill={color} stroke="#fff" strokeWidth="1.5" />
          <text x={TRAJ_PAD}           y={TRAJ_H - 6} textAnchor="middle" fill="#475569" fontSize="10" fontFamily="monospace">Pitcher</text>
          <text x={TRAJ_W - TRAJ_PAD} y={TRAJ_H - 6} textAnchor="middle" fill="#475569" fontSize="10" fontFamily="monospace">Plate</text>
          {/* Arm-side labels */}
          <text x={TRAJ_W - TRAJ_PAD - 18} y={TRAJ_PAD + 12} textAnchor="middle" fill="#475569" fontSize="9" fontFamily="monospace">Arm</text>
          <text x={TRAJ_W - TRAJ_PAD - 18} y={TRAJ_H - TRAJ_PAD - 4} textAnchor="middle" fill="#475569" fontSize="9" fontFamily="monospace">Glove</text>
        </svg>
      </div>
    </div>
  );
};

// ======================================================================
// Sub-component: Pitch table
// ======================================================================
const PitchTable: React.FC<{
  pitches: ReplayPitchEvent[];
  selected: number | null;
  onSelect: (idx: number) => void;
  filterType: string;
  playerNames: Map<string, string>;
}> = ({ pitches, selected, onSelect, filterType, playerNames }) => {
  const filtered = pitches
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => filterType === 'all' || p.pitchType === filterType);

  return (
    <div className="overflow-y-auto max-h-72 custom-scrollbar text-xs font-mono">
      <table className="w-full text-left text-slate-300">
        <thead className="bg-slate-800 text-slate-500 sticky top-0 z-10">
          <tr>
            <th className="px-2 py-1">#</th>
            <th className="px-2 py-1">Inn</th>
            <th className="px-2 py-1">Batter</th>
            <th className="px-2 py-1">Pitcher</th>
            <th className="px-2 py-1">Type</th>
            <th className="px-2 py-1 text-center">MPH</th>
            <th className="px-2 py-1">Count</th>
            <th className="px-2 py-1">Result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40">
          {filtered.map(({ p, i }) => {
            const isSelected = selected === i;
            const color = pitchColor(p.pitchType);
            return (
              <tr
                key={i}
                onClick={() => onSelect(i)}
                className={`cursor-pointer transition-colors ${isSelected ? 'bg-slate-700' : 'hover:bg-slate-800/60'}`}
              >
                <td className="px-2 py-1 text-slate-500">{i + 1}</td>
                <td className="px-2 py-1 text-slate-400">{p.isTop ? '▲' : '▼'}{p.inning}</td>
                <td className="px-2 py-1 truncate max-w-[90px] text-white">
                  {playerNames.get(p.batterId) ?? p.batterId.slice(0, 8)}
                </td>
                <td className="px-2 py-1 truncate max-w-[90px] text-slate-400">
                  {playerNames.get(p.pitcherId) ?? p.pitcherId.slice(0, 8)}
                </td>
                <td className="px-2 py-1">
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    {p.pitchType}
                  </span>
                </td>
                <td className="px-2 py-1 text-center">{p.speed}</td>
                <td className="px-2 py-1 text-slate-400">{p.countBefore}</td>
                <td className={`px-2 py-1 font-semibold ${
                  p.result === 'Ball' ? 'text-emerald-400' :
                  p.result.includes('Strike') ? 'text-red-400' :
                  p.result === 'In Play' ? 'text-blue-400' :
                  'text-slate-300'
                }`}>
                  {p.result}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ======================================================================
// Sub-component: Hit Location Field Chart (2D diamond view)
// ======================================================================
const FIELD_W = 400;
const FIELD_H = 400;
const FIELD_CX = FIELD_W / 2;     // home plate x center
const FIELD_CY = FIELD_H - 30;    // home plate y (near bottom)
const FIELD_SCALE = 0.75;         // ft → px scale factor

// Convert field coordinates (ft from home: x=left/right, y=toward CF) to SVG
const fieldToSVG = (fx: number, fy: number) => ({
  px: FIELD_CX + fx * FIELD_SCALE,
  py: FIELD_CY - fy * FIELD_SCALE,
});

const HIT_TYPE_COLORS: Record<string, string> = {
  ground: '#22c55e',  // green
  line:   '#3b82f6',  // blue
  fly:    '#eab308',  // yellow
  hr:     '#ef4444',  // red
};

const HitLocationChart: React.FC<{
  pitches: ReplayPitchEvent[];
}> = ({ pitches }) => {
  // Only show pitches that resulted in balls in play with hit location data
  const hits = useMemo(() =>
    pitches.filter(p => p.result === 'In Play' && p.hitLocation),
    [pitches]
  );

  // Draw foul lines and outfield fence arc
  const foulLineLength = 340;
  const leftFoul = fieldToSVG(-foulLineLength * Math.sin(Math.PI / 4), foulLineLength * Math.cos(Math.PI / 4));
  const rightFoul = fieldToSVG(foulLineLength * Math.sin(Math.PI / 4), foulLineLength * Math.cos(Math.PI / 4));
  const homeSVG = fieldToSVG(0, 0);

  // Outfield fence arc (approximate at ~330-400 ft)
  const fencePoints: string[] = [];
  for (let angle = -45; angle <= 45; angle += 3) {
    const rad = (angle * Math.PI) / 180;
    // Variable fence distance: shorter in corners (~330), deeper in CF (~400)
    const dist = 330 + 70 * Math.cos(rad * 2);
    const pt = fieldToSVG(dist * Math.sin(rad), dist * Math.cos(rad));
    fencePoints.push(`${pt.px.toFixed(1)},${pt.py.toFixed(1)}`);
  }

  // Infield diamond (90ft basepaths)
  const first = fieldToSVG(63.6, 63.6);   // 90 * cos(45), 90 * sin(45)
  const second = fieldToSVG(0, 127.3);     // 90√2
  const third = fieldToSVG(-63.6, 63.6);

  // Infield dirt arc (~95ft radius)
  const infieldArc: string[] = [];
  for (let angle = -45; angle <= 45; angle += 5) {
    const rad = (angle * Math.PI) / 180;
    const pt = fieldToSVG(95 * Math.sin(rad), 95 * Math.cos(rad));
    infieldArc.push(`${pt.px.toFixed(1)},${pt.py.toFixed(1)}`);
  }

  // Grass line at ~150ft
  const grassArc: string[] = [];
  for (let angle = -45; angle <= 45; angle += 3) {
    const rad = (angle * Math.PI) / 180;
    const pt = fieldToSVG(165 * Math.sin(rad), 165 * Math.cos(rad));
    grassArc.push(`${pt.px.toFixed(1)},${pt.py.toFixed(1)}`);
  }

  return (
    <div>
      <svg viewBox={`0 0 ${FIELD_W} ${FIELD_H}`} className="w-full max-w-sm mx-auto">
        {/* Background */}
        <rect x="0" y="0" width={FIELD_W} height={FIELD_H} fill="#0f172a" rx="8" />

        {/* Outfield grass fill */}
        <polygon
          points={`${homeSVG.px},${homeSVG.py} ${leftFoul.px},${leftFoul.py} ${fencePoints.join(' ')} ${rightFoul.px},${rightFoul.py}`}
          fill="#15412a"
          opacity="0.3"
        />

        {/* Infield dirt */}
        <polygon
          points={`${homeSVG.px},${homeSVG.py} ${infieldArc.join(' ')} ${homeSVG.px},${homeSVG.py}`}
          fill="#3d2a14"
          opacity="0.3"
        />

        {/* Outfield fence */}
        <polyline points={fencePoints.join(' ')} fill="none" stroke="#475569" strokeWidth="2" strokeDasharray="6 3" />

        {/* Foul lines */}
        <line x1={homeSVG.px} y1={homeSVG.py} x2={leftFoul.px} y2={leftFoul.py} stroke="#475569" strokeWidth="1.5" />
        <line x1={homeSVG.px} y1={homeSVG.py} x2={rightFoul.px} y2={rightFoul.py} stroke="#475569" strokeWidth="1.5" />

        {/* Base paths */}
        <line x1={homeSVG.px} y1={homeSVG.py} x2={first.px} y2={first.py} stroke="#64748b" strokeWidth="1" />
        <line x1={first.px} y1={first.py} x2={second.px} y2={second.py} stroke="#64748b" strokeWidth="1" />
        <line x1={second.px} y1={second.py} x2={third.px} y2={third.py} stroke="#64748b" strokeWidth="1" />
        <line x1={third.px} y1={third.py} x2={homeSVG.px} y2={homeSVG.py} stroke="#64748b" strokeWidth="1" />

        {/* Bases */}
        {[first, second, third].map((b, i) => (
          <rect key={i} x={b.px - 4} y={b.py - 4} width={8} height={8} fill="#94a3b8" transform={`rotate(45 ${b.px} ${b.py})`} />
        ))}

        {/* Home plate */}
        <circle cx={homeSVG.px} cy={homeSVG.py} r={5} fill="#e2e8f0" />

        {/* Mound */}
        {(() => {
          const mound = fieldToSVG(0, 60.5);
          return <circle cx={mound.px} cy={mound.py} r={3} fill="#94a3b8" opacity="0.5" />;
        })()}

        {/* Distance markers */}
        {[200, 300, 400].map(d => {
          const pt = fieldToSVG(0, d);
          return (
            <text key={d} x={pt.px + 12} y={pt.py} fill="#475569" fontSize="9" fontFamily="monospace">{d}ft</text>
          );
        })}

        {/* Hit dots */}
        {hits.map((p, i) => {
          const loc = p.hitLocation!;
          const { px, py } = fieldToSVG(loc.x, loc.y);
          const color = HIT_TYPE_COLORS[loc.type] || '#94a3b8';
          // Clamp to visible area
          const cx = Math.max(5, Math.min(FIELD_W - 5, px));
          const cy = Math.max(5, Math.min(FIELD_H - 5, py));
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={4}
              fill={color}
              opacity={0.8}
              stroke="#000"
              strokeWidth="0.5"
            >
              <title>{loc.type.toUpperCase()} — {loc.x}ft, {loc.y}ft</title>
            </circle>
          );
        })}

        {/* Labels */}
        <text x={FIELD_CX} y="16" textAnchor="middle" fill="#64748b" fontSize="12" fontFamily="monospace">
          Hit Location Chart
        </text>
        {(() => {
          const lf = fieldToSVG(-180, 220);
          const cf = fieldToSVG(0, 280);
          const rf = fieldToSVG(180, 220);
          return (
            <>
              <text x={lf.px} y={lf.py} textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="monospace">LF</text>
              <text x={cf.px} y={cf.py} textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="monospace">CF</text>
              <text x={rf.px} y={rf.py} textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="monospace">RF</text>
            </>
          );
        })()}
      </svg>

      {/* Legend */}
      <div className="flex justify-center gap-3 mt-2">
        {Object.entries(HIT_TYPE_COLORS).map(([type, color]) => {
          const count = hits.filter(h => h.hitLocation?.type === type).length;
          return (
            <span key={type} className="flex items-center gap-1 text-xs font-mono text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              {type === 'hr' ? 'HR' : type.charAt(0).toUpperCase() + type.slice(1)} ({count})
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ======================================================================
// Main PitchReplayViewer component
// ======================================================================
export const PitchReplayViewer: React.FC<PitchReplayViewerProps> = ({
  replay,
  playerNames,
  homeTeamName,
  awayTeamName,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [filterType, setFilterType]   = useState<string>('all');
  const [filterInning, setFilterInning] = useState<number | 'all'>('all');
  const [activeView, setActiveView] = useState<'spray' | '3d' | 'field'>('spray');
  const [leftView, setLeftView] = useState<'zone' | 'field'>('zone');

  // Extract all pitch events from replay
  const allPitches = useMemo(
    () => replay.events.filter((e): e is ReplayPitchEvent => e.kind === 'pitch'),
    [replay]
  );

  // Unique pitch types for filter
  const pitchTypes = useMemo(
    () => ['all', ...Array.from(new Set(allPitches.map(p => p.pitchType))).sort()],
    [allPitches]
  );

  // Unique innings
  const innings = useMemo(
    () => (['all', ...Array.from(new Set(allPitches.map(p => p.inning))).sort((a, b) => (a as number) - (b as number))]),
    [allPitches]
  );

  // Filtered pitches
  const visiblePitches = useMemo(() => {
    return allPitches.filter(p => {
      if (filterType !== 'all' && p.pitchType !== filterType) return false;
      if (filterInning !== 'all' && p.inning !== filterInning) return false;
      return true;
    });
  }, [allPitches, filterType, filterInning]);

  const selectedPitch: ReplayPitchEvent | null =
    selectedIdx !== null ? (allPitches[selectedIdx] ?? null) : null;

  const handleSelect = (idx: number) => {
    setSelectedIdx(prev => (prev === idx ? null : idx));
    setActiveView('3d');
  };

  // Stats summary
  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalSpeed = 0; let speedN = 0;
    let balls = 0; let strikes = 0; let inPlay = 0;
    for (const p of visiblePitches) {
      counts[p.pitchType] = (counts[p.pitchType] || 0) + 1;
      totalSpeed += p.speed; speedN++;
      if (p.result === 'Ball') balls++;
      else if (p.result === 'In Play') inPlay++;
      else strikes++;
    }
    return { counts, avgSpeed: speedN > 0 ? (totalSpeed / speedN).toFixed(1) : '--', balls, strikes, inPlay, total: visiblePitches.length };
  }, [visiblePitches]);

  if (allPitches.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        No pitch replay data available for this game.
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Pitch type filter */}
        <div>
          <label className="text-xs text-slate-500 mr-1 font-mono uppercase">Type</label>
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setSelectedIdx(null); }}
            className="bg-slate-800 border border-slate-700 text-white text-xs rounded px-2 py-1"
          >
            {pitchTypes.map(t => (
              <option key={t} value={t}>
                {t === 'all' ? 'All Types' : t}
              </option>
            ))}
          </select>
        </div>

        {/* Inning filter */}
        <div>
          <label className="text-xs text-slate-500 mr-1 font-mono uppercase">Inning</label>
          <select
            value={filterInning}
            onChange={e => { setFilterInning(e.target.value === 'all' ? 'all' : parseInt(e.target.value)); setSelectedIdx(null); }}
            className="bg-slate-800 border border-slate-700 text-white text-xs rounded px-2 py-1"
          >
            {innings.map(i => (
              <option key={String(i)} value={i}>
                {i === 'all' ? 'All Innings' : `Inning ${i}`}
              </option>
            ))}
          </select>
        </div>

        {/* Stats pills */}
        <div className="flex gap-2 ml-auto text-xs font-mono">
          <span className="bg-emerald-900/40 text-emerald-400 rounded px-2 py-0.5">{summary.total} pitches</span>
          <span className="bg-slate-800 text-slate-400 rounded px-2 py-0.5">~{summary.avgSpeed} mph avg</span>
          <span className="bg-red-900/30 text-red-400 rounded px-2 py-0.5">{summary.strikes}K</span>
          <span className="bg-green-900/30 text-green-400 rounded px-2 py-0.5">{summary.balls}B</span>
          <span className="bg-blue-900/30 text-blue-400 rounded px-2 py-0.5">{summary.inPlay}X</span>
        </div>
      </div>

      {/* ── Legend ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(PITCH_COLORS).map(([type, color]) => {
          const n = summary.counts[type];
          if (!n && filterType !== 'all') return null;
          return (
            <button
              key={type}
              onClick={() => { setFilterType(filterType === type ? 'all' : type); setSelectedIdx(null); }}
              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition ${
                filterType === type
                  ? 'border-white/40 bg-slate-700 text-white'
                  : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              {type}
              {n != null && <span className="text-slate-500 ml-0.5">({n})</span>}
            </button>
          );
        })}
      </div>

      {/* ── Main layout ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left: Strike zone chart / Hit location field */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-3">
          {/* Toggle between zone and field */}
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => setLeftView('zone')}
              className={`px-3 py-1 rounded text-xs font-medium transition ${leftView === 'zone' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              Strike Zone
            </button>
            <button
              onClick={() => setLeftView('field')}
              className={`px-3 py-1 rounded text-xs font-medium transition ${leftView === 'field' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              Hit Locations
            </button>
          </div>
          {leftView === 'zone' ? (
            <>
              <StrikeZoneChart
                pitches={visiblePitches}
                selected={selectedIdx}
                onSelect={handleSelect}
                filterType={filterType}
              />
              {selectedPitch && (
                <div className="mt-2 text-xs font-mono text-slate-400 text-center">
                  <span className="text-white font-semibold">{selectedPitch.pitchType}</span>
                  {' '}@ {selectedPitch.speed} mph |{' '}
                  <span className={
                    selectedPitch.result === 'Ball' ? 'text-emerald-400' :
                    selectedPitch.result.includes('Strike') ? 'text-red-400' :
                    'text-blue-400'
                  }>
                    {selectedPitch.result}
                  </span>
                  {' '}| {selectedPitch.countBefore}
                </div>
              )}
            </>
          ) : (
            <HitLocationChart pitches={visiblePitches} />
          )}
        </div>

        {/* Right: 3D trajectory or pitch table */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-3 flex flex-col">
          {/* Tab switcher */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setActiveView('spray')}
              className={`px-3 py-1 rounded text-xs font-medium transition ${activeView === 'spray' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              Pitch Log
            </button>
            <button
              onClick={() => setActiveView('3d')}
              className={`px-3 py-1 rounded text-xs font-medium transition ${activeView === '3d' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              Ball Path {selectedPitch ? `— ${selectedPitch.pitchType}` : ''}
            </button>
          </div>

          {activeView === 'spray' ? (
            <PitchTable
              pitches={visiblePitches}
              selected={selectedIdx}
              onSelect={handleSelect}
              filterType={filterType}
              playerNames={playerNames}
            />
          ) : selectedPitch ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
              {/* Pitch detail header */}
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-white font-bold">{selectedPitch.pitchType}</span>
                <span className="text-slate-400">{selectedPitch.speed} mph</span>
                <span className="text-slate-500">Count: {selectedPitch.countBefore}</span>
                <span className={
                  selectedPitch.result === 'Ball' ? 'text-emerald-400 font-bold' :
                  selectedPitch.result.includes('Strike') ? 'text-red-400 font-bold' :
                  'text-blue-400 font-bold'
                }>{selectedPitch.result}</span>
              </div>
              <TrajectoryView pitch={selectedPitch} />
              <div className="grid grid-cols-3 gap-1 text-xs font-mono mt-2">
                <div className="bg-slate-800/50 rounded p-2 text-center">
                  <div className="text-slate-500">Rel. Point</div>
                  <div className="text-white">{selectedPitch.releasePoint.x.toFixed(2)}, {selectedPitch.releasePoint.y.toFixed(2)}</div>
                </div>
                <div className="bg-slate-800/50 rounded p-2 text-center">
                  <div className="text-slate-500">Plate Loc</div>
                  <div className="text-white">{selectedPitch.platePoint.x.toFixed(2)}, {selectedPitch.platePoint.y.toFixed(2)}</div>
                </div>
                <div className="bg-slate-800/50 rounded p-2 text-center">
                  <div className="text-slate-500">H-Break</div>
                  <div className="text-white">{((selectedPitch.platePoint.x - selectedPitch.releasePoint.x) * 12).toFixed(1)} in</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm font-mono">
              Click any pitch in the chart or table<br />to view its ball path here
            </div>
          )}
        </div>
      </div>

      {/* ── Pitch-type breakdown bar ──────────────────────────────────── */}
      {summary.total > 0 && (
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-3">
          <p className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Arsenal Usage</p>
          <div className="flex h-4 rounded overflow-hidden gap-px">
            {Object.entries(summary.counts)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const pct = (count / summary.total) * 100;
                const color = pitchColor(type);
                return (
                  <div
                    key={type}
                    style={{ width: `${pct}%`, backgroundColor: color }}
                    className="relative group transition-all cursor-default"
                    title={`${type}: ${count} (${pct.toFixed(0)}%)`}
                  />
                );
              })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {Object.entries(summary.counts)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <span key={type} className="text-xs font-mono text-slate-400">
                  <span className="font-bold" style={{ color: pitchColor(type) }}>{type}</span>
                  {' '}{((count / summary.total) * 100).toFixed(0)}%
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
