# Deploy shortKut to Netlify (Free)

## Option 1: Deploy from GitHub (Recommended)

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/shortkut.git
   git push -u origin main
   ```

2. **Connect to Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Sign up/login with GitHub
   - Click "New site from Git"
   - Choose your repository
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `.next`
   - Click "Deploy site"

## Option 2: Deploy from Local Files

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Sign up/login
   - Drag and drop the `.next` folder to the deploy area
   - Or use Netlify CLI: `npx netlify deploy --prod --dir=.next`

## Features Included

✅ **PWA Support** - Install as app on mobile/desktop
✅ **Barcode Scanner** - Scan QR codes and barcodes
✅ **Card Management** - Create, edit, delete cards
✅ **Export/Import** - Backup and restore data
✅ **Duplicate Prevention** - No duplicate card numbers
✅ **Client-side Storage** - All data stored locally
✅ **Responsive Design** - Works on all devices

## Free Tier Limits

- **Bandwidth:** 100GB/month
- **Build minutes:** 300 minutes/month
- **Sites:** Unlimited
- **Custom domains:** Yes

This app is perfect for the free tier since it's client-side only with no database!

## HTTPS Required

The barcode scanner requires HTTPS to access the camera. Netlify provides free HTTPS certificates automatically.

## Custom Domain

You can add a custom domain in the Netlify dashboard under "Domain settings".
