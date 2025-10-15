module.exports = {
  launch: {
    headless: process.env.HEADLESS !== "false",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu"
    ]
  },
  ...(process.env.SKIP_SERVER !== "true" && {
    server: {
      command: "next dev -p 4000 --turbopack",
      port: 4000,
      launchTimeout: 10000,
      debug: true
    }
  })
};
