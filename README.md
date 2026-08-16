# Tracehelm

An immersive Three.js concept for real-time decision infrastructure. Tracehelm turns live GPS, telemetry, vision, voice, and policy signals into safe, explainable operational actions.

## Experience

- **World:** orbit a live signal globe, select nodes, and focus incidents.
- **Live decision:** change cold-chain sensor values and watch the recommendation recompute.
- **Model layer:** explore continuous 200 ms interaction turns, asynchronous reasoning, shared context, and tools.
- **Systems:** inspect procedural 3D fleet, factory, energy, and field objects.
- **Policy gate:** vary action risk and test deterministic guardrails.
- **Hidden interactions:** hold `Space` for decision replay, type `HELM`, or click the mark five times.

## Run locally

Serve the repository root with any static server, for example:

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Publish with GitHub Pages

Push these files to the `main` branch of a GitHub repository, then choose **Settings → Pages → Source → GitHub Actions**. The included workflow publishes the static site on every push; no build command or backend is required.

The site uses relative asset paths and hash-based chapters, so it works from both user/organization Pages and project Pages URLs.

## Architecture note

The model-layer visualization is informed by Thinking Machines Lab's interaction-model architecture: a continuously present foreground model, asynchronous background reasoning, shared evolving context, tools, and policy-controlled action.
