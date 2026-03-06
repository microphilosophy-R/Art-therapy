# Agent Directives & Environment Context

## 1. Project Overview
This project involves complex data structure reconstruction for a web application. The primary task is transforming, validating, and restructuring data safely without breaking the existing schema or entering infinite execution loops.

## 2. Environment Architecture (CRITICAL)
* **Host OS:** Windows.
* **Hybrid Development Environment:** * **Databases:** PostgreSQL and Redis run inside Docker containers (`arttherapy_postgres`, `arttherapy_redis`).
    * **Application Layer:** Node.js, Prisma, and React run directly on the Windows host.
* **Execution Rules:** * All Node.js, npm, and Prisma commands MUST be executed directly on the Windows host, primarily targeting the `c:\art therapy app\server` directory.
    * Do NOT attempt to run application logic or package installations inside the Docker containers.

## 3. Tech Stack
* **Runtime:** Node.js
* **Frontend:** React
* **Containerization:** Docker

## 4. Allowed Commands & Tool Usage
When using terminal or execution tools, restrict yourself to the following patterns:
* **Application Commands (Windows Host):**
    * `npm install`, `npm run dev`, `npx prisma <command>`
* **Database Service Verification (Windows Host):**
    * `docker ps` (Only to verify Postgres/Redis are running)
* **File Operations:**
    * Use standard file read/write tools targeting the Windows file system (`c:\art therapy app\...`).

## 5. Rules of Engagement for Tool Failures
1.  **No Blind Retries:** If a tool call fails (e.g., unexpected EOF, path not found, module missing), DO NOT immediately run the exact same command again.
2.  **Verify Context:** If a command fails, your next step must be to verify your current directory (`cd`, `dir`, or `pwd`) and check if you are on the Windows host or inside the Docker container.
3.  **Halt on Loops:** If you experience two consecutive tool execution failures, HALT execution and ask the user for clarification. Do not attempt to guess the correct environment configuration.