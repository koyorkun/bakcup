import axios from 'axios';
import fs from 'fs/promises';
import crypto from 'crypto';
import chalk from 'chalk';
import readline from 'readline';
import { banner } from './banner.js';

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Promisify readline question
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

class MailTMService {
    constructor() {
        this.baseURL = 'https://api.mail.tm';
        this.domain = 'bugfoo.com'; // Default domain
    }

    async getDomains() {
        try {
            const response = await axios.get(`${this.baseURL}/domains`);
            if (response.data['hydra:member'].length > 0) {
                this.domain = response.data['hydra:member'][0].domain;
            }
            return this.domain;
        } catch (error) {
            console.error(chalk.red('Error getting domains:', error.message));
            return this.domain;
        }
    }

    async createAccount() {
        const random = crypto.randomBytes(8).toString('hex');
        const email = `${random}@${this.domain}`;
        const password = crypto.randomBytes(10).toString('hex');

        try {
            await axios.post(`${this.baseURL}/accounts`, {
                address: email,
                password: password
            });

            const authResponse = await axios.post(`${this.baseURL}/token`, {
                address: email,
                password: password
            });

            return {
                email,
                password,
                token: authResponse.data.token
            };
        } catch (error) {
            console.error(chalk.red('Error creating email account:', error.message));
            throw error;
        }
    }

    async getMessages(token) {
        try {
            const response = await axios.get(`${this.baseURL}/messages`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data['hydra:member'];
        } catch (error) {
            console.error(chalk.red('Error fetching messages:', error.message));
            return [];
        }
    }

    async getMessage(messageId, token) {
        try {
            const response = await axios.get(`${this.baseURL}/messages/${messageId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error(chalk.red('Error fetching message:', error.message));
            return null;
        }
    }

    async waitForVerificationCode(token, maxAttempts = 20) {
        console.log(chalk.cyan(`🔍 Waiting for verification email...`));
        
        for (let i = 0; i < maxAttempts; i++) {
            const messages = await this.getMessages(token);
            
            for (const message of messages) {
                const fullMessage = await this.getMessage(message.id, token);
                if (fullMessage) {
                    // Extract verification code using regex
                    const codeMatch = fullMessage.text.match(/([A-F0-9]{20})/);
                    if (codeMatch) {
                        return codeMatch[1];
                    }
                }
            }

            // Wait 3 seconds before next attempt
            await new Promise(resolve => setTimeout(resolve, 3000));
            console.log(chalk.cyan(`⏳ Attempt ${i + 1}/${maxAttempts} - Waiting for verification code...`));
        }

        throw new Error('Verification code not received after maximum attempts');
    }
}

class BlockPadBot {
    constructor() {
        this.baseURL = 'https://api2.blockpad.fun/api';
        this.headers = {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.5',
            'Content-Type': 'application/json',
            'Origin': 'https://testnet.blockpad.fun',
            'Referer': 'https://testnet.blockpad.fun/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            'sec-ch-ua': '"Not(A:Brand";v="99", "Brave";v="133", "Chromium";v="133"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
        };
        this.mailService = new MailTMService();
    }

    async register(username, email, password, referralCode) {
        try {
            const response = await axios.post(
                `${this.baseURL}/auth/register`,
                {
                    username,
                    email,
                    password,
                    referralCode
                },
                { headers: this.headers }
            );

            console.log(chalk.green('Registration Response:', response.data));
            return response.data;
        } catch (error) {
            console.error(chalk.red('Registration Error:', error.response?.data || error.message));
            throw error;
        }
    }

    async verifyEmail(verificationCode) {
        try {
            const response = await axios.post(
                `${this.baseURL}/auth/verify-email`,
                { verificationCode },
                { headers: this.headers }
            );

            console.log(chalk.green('Verification Response:', response.data));
            return response.data;
        } catch (error) {
            console.error(chalk.red('Verification Error:', error.response?.data || error.message));
            throw error;
        }
    }

    generateRandomUsername() {
        const adjectives = ['Cool', 'Super', 'Mega', 'Ultra', 'Hyper', 'Epic', 'Alpha', 'Beta', 'Gamma', 'Delta'];
        const nouns = ['Trader', 'Investor', 'Holder', 'Master', 'Pro', 'Expert', 'Guru', 'Wizard', 'Ninja', 'Champion'];
        const random = crypto.randomBytes(3).toString('hex');
        
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        
        return `${adj}${noun}${random}`;
    }
}

async function readReferralCodes() {
    try {
        const data = await fs.readFile('code.txt', 'utf8');
        return data.split('\n').map(code => code.trim()).filter(code => code);
    } catch (error) {
        console.error(chalk.red('Error reading referral codes:', error.message));
        return [];
    }
}

async function saveSuccessfulRegistration(userData) {
    const data = `${userData.username},${userData.email},${userData.password},${userData.referralCode},${userData.token}\n`;
    try {
        await fs.appendFile('successful_registrations.txt', data);
        console.log(chalk.green('✅ Registration data saved successfully'));
    } catch (error) {
        console.error(chalk.red('Error saving registration data:', error.message));
    }
}

async function main() {
    try {
        // Display banner
        banner();
        
        console.log(chalk.cyan('\n🚀 Starting BlockPad Auto Referral Bot...\n'));

        // Get number of accounts to create
        const numAccounts = parseInt(await question(chalk.yellow('Enter the number of accounts to create: ')));
        
        if (isNaN(numAccounts) || numAccounts <= 0) {
            console.error(chalk.red('❌ Please enter a valid number greater than 0'));
            rl.close();
            return;
        }

        const referralCodes = await readReferralCodes();
        if (referralCodes.length === 0) {
            console.error(chalk.red('❌ No referral codes found in code.txt'));
            rl.close();
            return;
        }

        console.log(chalk.green(`📝 Loaded ${referralCodes.length} referral codes`));
        console.log(chalk.cyan(`🎯 Will create ${numAccounts} accounts\n`));

        const bot = new BlockPadBot();
        
        // Get available domain first
        console.log(chalk.cyan('🔄 Getting available email domain...'));
        const domain = await bot.mailService.getDomains();
        console.log(chalk.green(`✅ Using email domain: ${domain}\n`));

        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < numAccounts; i++) {
            const referralCode = referralCodes[i % referralCodes.length]; // Cycle through referral codes
            console.log(chalk.yellow(`\n📋 Creating account ${i + 1}/${numAccounts} using referral code: ${referralCode}`));

            try {
                const username = bot.generateRandomUsername();
                console.log(chalk.cyan(`👤 Generated username: ${username}`));
                
                // Create temp email account
                console.log(chalk.cyan('📧 Creating temporary email account...'));
                const mailAccount = await bot.mailService.createAccount();
                console.log(chalk.green(`✅ Created email: ${mailAccount.email}`));
                
                // Register new account
                console.log(chalk.cyan('🔄 Registering new account...'));
                await bot.register(username, mailAccount.email, mailAccount.password, referralCode);
                console.log(chalk.green('✅ Registration successful'));
                
                // Wait for and get verification code
                const verificationCode = await bot.mailService.waitForVerificationCode(mailAccount.token);
                console.log(chalk.green(`✅ Received verification code: ${verificationCode}`));
                
                // Verify email
                console.log(chalk.cyan('🔄 Verifying email...'));
                const verificationResult = await bot.verifyEmail(verificationCode);
                
                // Save successful registration
                await saveSuccessfulRegistration({
                    username,
                    email: mailAccount.email,
                    password: mailAccount.password,
                    referralCode,
                    token: verificationResult.token
                });

                console.log(chalk.green(`✅ Successfully registered and verified ${username}`));
                successCount++;
                
                // Wait between registrations to avoid rate limiting
                const waitTime = 5;
                console.log(chalk.cyan(`⏳ Waiting ${waitTime} seconds before next registration...`));
                await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
                
            } catch (error) {
                console.error(chalk.red(`❌ Failed to create account:`, error.message));
                failureCount++;
                console.log(chalk.cyan('⏳ Waiting 5 seconds before next attempt...'));
                await new Promise(resolve => setTimeout(resolve, 5000));
                continue;
            }
        }

        // Display final statistics
        console.log(chalk.cyan('\n📊 Registration Statistics:'));
        console.log(chalk.green(`✅ Successful registrations: ${successCount}`));
        console.log(chalk.red(`❌ Failed registrations: ${failureCount}`));
        console.log(chalk.yellow(`📈 Success rate: ${((successCount / numAccounts) * 100).toFixed(2)}%`));
        
        console.log(chalk.green('\n✨ Bot execution completed!\n'));
        
    } catch (error) {
        console.error(chalk.red('❌ Fatal error:', error.message));
    } finally {
        rl.close();
    }
}

// Run the bot
main().catch(error => {
    console.error(chalk.red('❌ Fatal error:', error.message));
    rl.close();
    process.exit(1);
});