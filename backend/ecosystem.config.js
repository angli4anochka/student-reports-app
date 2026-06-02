module.exports = {
  apps: [{
    name: "student-reports-api",
    script: "npx",
    args: "ts-node --transpile-only src/server.ts",
    cwd: "/home/ubuntu/student-reports-app/backend",
    env: {
      NODE_ENV: "production",
      PORT: 3001
    }
  }]
}
