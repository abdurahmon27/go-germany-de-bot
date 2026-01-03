# Go Germany Telegram Bot

A production-ready Telegram bot for Go Germany services built with Node.js and MongoDB.

## Features

### User Features
- **Onboarding Flow**: Phone sharing, channel subscription verification, passport name entry
- **WhatsApp Group Access**: Time-limited link display for approved users
- **Germany Services**: Work & Travel, Study, Ausbildung, Arbeitsvisum

### Admin Features
- **User Export**: Export all onboarded users to Excel
- **Allowed Names Management**: Add passport names for WhatsApp access
- **Broadcast Messages**: Send announcements to all users

## Prerequisites

- Node.js 18+
- MongoDB 5+
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/go-germany-de-bot.git
cd go-germany-de-bot
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the bot:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Configuration

All configuration is done via environment variables. See `.env.example` for details.

### Required Variables

| Variable | Description |
|----------|-------------|
| `BOT_TOKEN` | Telegram bot token from @BotFather |
| `MONGO_URI` | MongoDB connection string |
| `ADMIN_IDS` | Comma-separated list of admin Telegram IDs |
| `CHANNEL_1_ID` | First required channel ID |
| `CHANNEL_1_LINK` | First channel invite link |
| `CHANNEL_2_ID` | Second required channel ID |
| `CHANNEL_2_LINK` | Second channel invite link |
| `WHATSAPP_GROUP_LINK` | WhatsApp group invite link |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WHATSAPP_LINK_DISPLAY_SECONDS` | 60 | Duration to show WhatsApp link |
| `BROADCAST_DELAY_MS` | 50 | Delay between broadcast messages |
| `LOG_LEVEL` | info | Logging level |

## Project Structure

```
src/
├── config/          # Configuration management
├── database/        # Database connection
├── handlers/        # Bot command and action handlers
│   ├── admin.js     # Admin panel handlers
│   ├── menu.js      # Main menu handlers
│   ├── onboarding.js # Onboarding flow handlers
│   ├── services.js  # Germany services handlers
│   └── whatsapp.js  # WhatsApp link handlers
├── middlewares/     # Telegram bot middlewares
│   ├── admin.js     # Admin access control
│   ├── onboarding.js # Onboarding guard
│   └── user.js      # User registration
├── models/          # MongoDB models
│   ├── AllowedName.js # Allowed names for WhatsApp
│   └── User.js      # User data model
├── utils/           # Utility functions
│   ├── broadcast.js # Message broadcasting
│   ├── channels.js  # Channel membership checking
│   ├── excel.js     # Excel export
│   ├── keyboards.js # Telegram keyboards
│   └── validation.js # Input validation
└── index.js         # Main entry point
```

## User Flow

### Onboarding
1. User clicks /start
2. User shares phone number (required)
3. User joins both required channels
4. Bot verifies channel membership
5. User enters passport first name and last name
6. User confirms passport details
7. Onboarding complete - main menu shown

### Main Menu
- **Get WhatsApp Group Link**: Shows time-limited link if name is approved
- **Work & Travel / Study / Ausbildung / Arbeitsvisum**: Starts service request flow

### Service Request Flow
1. User selects a service
2. Bot shows stored phone number for confirmation
3. User confirms or provides alternative number
4. Request submitted, admin notified

## Admin Commands

- `/admin` - Open admin panel
- **Export Users** - Download Excel file with all onboarded users
- **Add Allowed Names** - Add names to WhatsApp access list
- **Broadcast** - Send message to all onboarded users

## Channel Setup

The bot needs to be an administrator in both required channels to verify user membership. Add the bot as an admin with at least "Read Messages" permission.

## License

MIT
