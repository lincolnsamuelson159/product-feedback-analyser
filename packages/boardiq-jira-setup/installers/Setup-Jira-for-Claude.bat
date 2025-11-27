@echo off
setlocal enabledelayedexpansion

title Board Intelligence - Jira Setup for Claude Desktop

cls
echo ================================================================
echo   Board Intelligence - Jira Setup for Claude Desktop
echo ================================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo X Node.js is not installed.
    echo.
    echo Please install Node.js first:
    echo   1. Go to: https://nodejs.org/
    echo   2. Download and install the LTS version
    echo   3. Run this installer again
    echo.
    pause
    exit /b 1
)

:: Config file location
set "CONFIG_DIR=%APPDATA%\Claude"
set "CONFIG_FILE=%CONFIG_DIR%\claude_desktop_config.json"

echo This will configure Claude Desktop to connect to Jira.
echo.

:: Get email
echo Step 1: Enter your Board Intelligence email
set /p EMAIL="Email: "

if "%EMAIL%"=="" (
    echo X Email is required
    pause
    exit /b 1
)

echo.

:: Get API token
echo Step 2: Enter your Jira API Token
echo.
echo Don't have one? Create it here:
echo   https://id.atlassian.com/manage-profile/security/api-tokens
echo.
set /p TOKEN="API Token: "

if "%TOKEN%"=="" (
    echo X API Token is required
    pause
    exit /b 1
)

echo.
echo Configuring Claude Desktop...

:: Create directory if it doesn't exist
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

:: Backup existing config if it exists
if exist "%CONFIG_FILE%" (
    copy "%CONFIG_FILE%" "%CONFIG_FILE%.backup.%date:~-4%%date:~4,2%%date:~7,2%" >nul 2>nul
    echo + Backed up existing config
)

:: Create the config file using Node.js
node -e "const fs = require('fs'); const configDir = process.env.APPDATA + '\\Claude'; const configFile = configDir + '\\claude_desktop_config.json'; let config = {}; try { config = JSON.parse(fs.readFileSync(configFile)); } catch(e) {} if (!config.mcpServers) config.mcpServers = {}; config.mcpServers.jira = { command: 'npx', args: ['-y', '@aashari/mcp-server-atlassian-jira'], env: { ATLASSIAN_SITE_NAME: 'boardiq', ATLASSIAN_USER_EMAIL: '%EMAIL%', ATLASSIAN_API_TOKEN: '%TOKEN%' } }; fs.writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n');"

if %errorlevel% neq 0 (
    echo X Failed to configure. Please try again or contact support.
    pause
    exit /b 1
)

echo.
echo ================================================================
echo   + Setup Complete!
echo ================================================================
echo.
echo !! IMPORTANT: You must restart Claude Desktop now.
echo.
echo    1. Right-click Claude in the system tray
echo    2. Click "Quit"
echo    3. Reopen Claude Desktop
echo.
echo Then try asking Claude:
echo    - "Show me issues in project BPD"
echo    - "What issues were updated this week?"
echo.
pause
