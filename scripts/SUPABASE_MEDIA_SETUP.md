## Supabase Media Upload

This uploads all project media to a public Supabase Storage bucket and generates a URL map.

### 1. Set env vars (PowerShell)

```powershell
$env:SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
$env:SUPABASE_BUCKET="media"
```

### 2. Dry run (optional)

```powershell
$env:DRY_RUN="true"
node scripts/upload-media-to-supabase.mjs
```

### 3. Upload

```powershell
Remove-Item Env:DRY_RUN -ErrorAction SilentlyContinue
node scripts/upload-media-to-supabase.mjs
```

### Output

- `data/supabase-media-map.json`
  - Keys = current local paths (example: `assets/photos/IMG_20170423_145520.jpg`)
  - Values = public Supabase URLs

### Notes

- Bucket is auto-created as public if it does not exist.
- Upload uses upsert, so reruns overwrite changed files.
- Keep your service role key private (never commit it).

