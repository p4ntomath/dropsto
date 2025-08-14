# DropSto

> **Store. Share. Simplify.**

DropSto is a lightweight, serverless, temporary file storage web app designed for quick and easy sharing without repeated logins. Perfect for students, teams, and anyone who needs fast, no-hassle file sharing between locations like labs, classrooms, and home.

## What is DropSto?

DropSto revolutionizes file sharing by eliminating the friction of traditional cloud storage services. Users create a storage bucket once, receive a unique PIN code, and can then upload, download, or delete files from anywhere no account login needed after bucket creation. Files are stored securely and automatically deleted after 7 days, making it ideal for temporary file sharing scenarios.

## Perfect For

- **Students** sharing projects between campus labs and home computers
- **Teams** collaborating on temporary files without complex account setups
- **Professionals** transferring files between different work locations
- **Anyone** who needs quick, temporary file storage without the overhead

## Key Features

### One-Time Setup
- Create your bucket once with a simple name
- Receive a unique PIN code for access
- No repeated logins or password management

### Effortless File Management
- Drag and drop files directly into your bucket
- Upload from any device without logging in
- Download or delete files using just your PIN

### Secure & Temporary
- Bank-level encryption keeps your files safe
- Files automatically delete after 7 days
- No permanent storage means enhanced privacy

### Universal Access
- Access your files from any device, anywhere
- Works on desktop, tablet, and mobile
- No app installation required

### Lightning Fast
- Serverless architecture for instant responsiveness
- No complicated interfaces or confusing navigation
- Upload and download at maximum speeds

## How It Works

### 1. Create Your Bucket
Sign up once, name your bucket, and get your unique PIN code.

### 2. Upload Your Files
Drop files directly into your bucket anytime — no login needed.

### 3. Access or Share Anywhere
Use your PIN to download or manage files from any device.
*(Files auto-delete after 7 days to keep things fresh.)*

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Background Effects**: Vanta.js
- **Architecture**: Serverless design for maximum efficiency

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/p4ntomath/dropsto.git
cd dropsto
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

## Use Cases

### For Students
- **Lab to Home**: Upload files in the computer lab, download at home
- **Group Projects**: Share files with teammates without email attachments
- **Quick Transfers**: Move files between different campus computers

### For Teams
- **Temporary Collaboration**: Share work files without setting up shared drives
- **Client Deliverables**: Provide temporary access to files for clients
- **Cross-Platform Sharing**: Transfer files between different operating systems

### For Professionals
- **Remote Work**: Access files from home, office, and travel locations
- **Client Presentations**: Share presentation files temporarily
- **Quick Backups**: Store important files temporarily while traveling

## Security & Privacy

- **End-to-end Encryption**: All files are encrypted during transfer and storage
- **Temporary Storage**: 7-day auto-deletion ensures no permanent data retention
- **PIN-based Access**: Unique PIN codes provide secure, shareable access
- **No Tracking**: Minimal data collection focuses only on essential functionality

## Why Choose DropSto?

### vs. Traditional Cloud Storage
- No account management after initial setup
- No subscription fees
- Automatic cleanup prevents storage bloat
- Faster access with PIN-based system

### vs. Email Attachments
- No email account required for recipients
- Better security and encryption
- Organized storage instead of cluttered inboxes

### vs. USB Drives
- Access from any internet-connected device
- No physical device to lose or forget
- Automatic sharing capabilities
- No risk of hardware failure

## Cross-Platform Compatibility

DropSto works seamlessly across all platforms:
- **Desktop**: Windows, macOS, Linux
- **Mobile**: iOS Safari, Android Chrome
- **Tablets**: iPad, Android tablets
- **Browsers**: Chrome, Firefox, Safari, Edge

## Development

### Project Structure
```
dropsto/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Main page components
│   └── assets/        # Static assets
├── public/            # Public assets
└── README.md
```

### Contributing
We welcome contributions! Please feel free to submit issues and pull requests.