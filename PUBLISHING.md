# Publishing checklist

Recommended repository description:

```text
Portfolio-safe reconstruction of a Python + SAP GUI Scripting material-master automation workflow for MM01/MM02.
```

Recommended topics:

```text
sap
sap-gui-scripting
python
automation
erp
material-master
business-process-automation
input-validation
process-improvement
portfolio
```

## GitHub Pages

1. Open **Settings → Pages**.
2. Under **Build and deployment**, select **GitHub Actions** as the source.
3. The included workflow publishes the static application after a push to `main`.
4. Confirm that both interactive and guided workflows work.
5. Keep the deployed URL in the repository **Website** field.

Expected Pages URL:

```text
https://yospadilla.github.io/sap-material-master-automation-demo/
```

## Public-release checks

- Repository contains synthetic data only.
- Live demo displays `DEMO MODE` / `Synthetic data`.
- No credentials, production SAP data or internal system details are committed.
- Benchmark wording remains workflow-specific: ~100 materials, ~90 min manual → ~10 min automated.
- README clearly separates the professional Python/SAP GUI implementation from the JavaScript public reconstruction.
