# Publishing checklist

Recommended repository description:

```text
Portfolio-safe simulation of a Python + SAP GUI Scripting material-master automation workflow for MM01/MM02.
```

Recommended topics:

```text
sap
sap-gui-scripting
python
automation
erp
business-process-automation
material-master
playwright
portfolio
```

## GitHub Pages

1. Open **Settings → Pages**.
2. Under **Build and deployment**, select **GitHub Actions** as the source.
3. The included `Deploy portfolio demo to GitHub Pages` workflow will publish the static application after a push to `main`.
4. Confirm that the demo opens and that Interactive and Director modes both work.
5. Add the deployed URL to the repository **Website** field.
6. Add the recommended topics above.

Expected Pages URL:

```text
https://yospadilla.github.io/sap-material-master-automation-demo/
```

## Before announcing it publicly

- Confirm the repository contains only synthetic data.
- Confirm the live demo displays `DEMO MODE` / `Synthetic data`.
- Confirm no `output/`, `node_modules/`, credentials or local system files were committed.
- Confirm the README images render correctly.
- Confirm the benchmark wording remains workflow-specific: ~100 materials, ~90 min manual → ~10 min automated.
