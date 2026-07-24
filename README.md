# bimpat

Just a dumb little game.

## Run locally

```bash
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Troubleshooting

**Port 3000 already in use**

```bash
lsof -ti :3000 | xargs kill -9
```

Then run `npm start` again.

## Deploy to Render

1. Push this repo to GitHub (or GitLab).
2. Log in to [Render](https://render.com) and click **New > Web Service**.
3. Connect your repository.
4. Set the following:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **Create Web Service**.

Render will pick up the `PORT` environment variable automatically. Pushes to your main branch will trigger automatic redeploys.
