import { Player, Position } from "../types";

export const getAdvancedScoutingReport = async (player: Player): Promise<string> => {
    // Simulate a network delay for effect
    await new Promise(r => setTimeout(r, 600));

    let report = [];

    if (player.position === Position.P) {
        const p = player.pitching!;
        if (p.era < 3.00) report.push(`${player.name} has been elite at preventing runs, showcasing ace potential.`);
        else if (p.era > 4.50) report.push(`${player.name} has struggled with command and keeping the ball in the yard.`);
        else report.push(`${player.name} is a reliable innings eater with league-average production.`);

        if (p.so > 180) report.push("His strikeout stuff is electric, generating swings and misses consistently.");
        else if (p.so < 80) report.push("He relies heavily on contact management rather than overpowering hitters.");

        if (player.rating > 90) report.push("Overall, he is one of the premier arms in the game today.");
        else if (player.potential > player.rating + 10) report.push("Scouts believe his best years are still ahead of him.");
    } else {
        const b = player.batting!;
        if (b.avg > 0.290) report.push(`${player.name} possesses elite bat-to-ball skills and is a constant threat to get on base.`);
        else if (b.avg < 0.220) report.push(`${player.name} has some swing-and-miss concerns but offers value elsewhere.`);
        else report.push(`${player.name} is a steady contributor with the bat.`);

        if (b.hr > 25) report.push("His power tool is legitimate, making him a middle-of-the-order threat.");
        else if (b.sb > 20) report.push("He brings elite speed on the basepaths, putting constant pressure on the defense.");

        if (b.ops > 0.850) report.push("An offensive juggernaut who drives run production.");
    }

    if (player.injury.isInjured) {
        report.push(`Currently dealing with a ${player.injury.type}, which is a concern for immediate availability.`);
    }

    return report.join(" ");
};