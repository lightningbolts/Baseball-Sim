<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1kqEa_Fzeu89kuClrC55FQWBbH4PyL4Ak

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Generate Real MLB Schedule

- Convert the provided CSV into a JSON schedule used by the simulator:

```bash
npm run convert:schedule
```

- This reads ICS to CSV Converter.csv and writes services/schedule.json. On app start, the schedule loader prefers this JSON, falling back to the embedded sample if missing.
