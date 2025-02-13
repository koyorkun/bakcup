# BlockPad Auto Referral Bot

An automated bot for creating BlockPad accounts using referral codes.

## Register
- https://testnet.blockpad.fun/register?ref=Z63Y6P

## Features
- Automated account creation
- Temporary email generation
- Email verification
- Progress tracking
- Success/failure statistics
- Colorful console output

## Prerequisites
- Node.js v14 or higher
- npm (Node Package Manager)

## Installation
1. Clone this repository
```bash
git clone https://github.com/airdropinsiders/Blockpad-AutoReff-Bot.git
cd Blockpad-AutoReff-Bot
```
2. Install dependencies:
```bash
npm install
```

## Configuration
1. Create a `code.txt` file in the project root
2. Add your referral codes to `code.txt`, one per line

## Usage
1. Start the bot:
```bash
npm start
```
2. Enter the number of accounts you want to create when prompted
3. The bot will create accounts using the referral codes from code.txt
4. Results will be saved in `successful_registrations.txt`

## Output Files
- `successful_registrations.txt`: Contains details of successfully created accounts in CSV format:

```
username,email,password,referralCode,token
```

## Notes
- The bot includes a delay between registrations to avoid rate limiting
- Failed registrations will be logged but won't stop the process
- Each account uses a randomly generated username
