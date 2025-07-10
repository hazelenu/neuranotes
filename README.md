# NeuraNotes

An AI-enhanced note-taking platform that transforms how you interact with your documents and ideas. Built with React, Supabase, and OpenAI integration.

![NeuraNotes Demo](https://img.shields.io/badge/Status-Live-brightgreen)
![React](https://img.shields.io/badge/React-18.0+-blue)
![Vite](https://img.shields.io/badge/Vite-5.0+-purple)
![Supabase](https://img.shields.io/badge/Supabase-Database-green)

## Features

### AI-Powered Intelligence
- **Smart Summarization**: Get intelligent summaries of your content with `/summarize`
- **Interactive Q&A**: Ask questions about your documents with `/ask`
- **Retrieval-Augmented Generation (RAG)**: Context-aware AI responses
- **Demo Mode**: Pre-written responses for default documents

### Knowledge Management
- **Knowledge Graphs**: Automatically extract and visualize relationships between concepts
- **Entity Recognition**: Identify people, places, and concepts across documents
- **Connection Discovery**: Find hidden patterns in your knowledge base

### Advanced Search
- **Hybrid Search**: Combines keyword matching with semantic similarity
- **Semantic Understanding**: Find content by meaning, not just keywords
- **Document Filtering**: Search within specific documents or globally
- **Real-time Results**: Fast, responsive search experience

### Document Management
- **Multi-format Support**: Upload PDF, TXT, and Markdown files
- **Rich Text Editor**: Powered by Tiptap with formatting tools
- **Auto-save**: Never lose your work with intelligent auto-saving
- **Document Viewer**: Clean, readable document display with scrolling

### Modern Interface
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Dark Theme**: Easy on the eyes with professional styling
- **Intuitive Navigation**: Clean, modern interface design
- **Real-time Feedback**: Loading states and progress indicators

## Live Demo

Visit the live application: [NeuraNotes on Vercel](https://neuranotes.vercel.app)

### Default Documents
The app comes with three pre-loaded documents for demonstration:
- **The Turing Test**: AI concepts and machine intelligence
- **Steve Jobs at Stanford**: Inspirational speech and life lessons
- **Getting Started Guide**: Platform features and usage instructions

## Technology Stack

- **Frontend**: React 18 + Vite
- **Editor**: Tiptap (rich text editing)
- **Database**: Supabase (PostgreSQL with vector extensions)
- **AI Integration**: OpenAI GPT-4 and text-embedding-3-large
- **Search**: pgvector for semantic search + Full Text Search
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key (optional for demo mode)

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/hazelenu/neuranotes.git
cd neuranotes
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Configuration**
Create a `.env` file in the root directory:
```env
# Supabase Configuration
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration (optional)
VITE_OPENAI_API_KEY=your_openai_api_key
```

4. **Database Setup**
Run the SQL scripts in your Supabase SQL Editor:
- `documents-table-setup.sql` - Main documents table
- `embeddings-table-setup.sql` - Vector embeddings
- `knowledge-graph-setup.sql` - Knowledge graph storage
- `add-default-documents-column.sql` - Default documents support

5. **Start Development Server**
```bash
npm run dev
```

Visit `http://localhost:5173` to see the application.

## Usage

### Getting Started
1. **Upload Documents**: Use the upload button to add PDF, TXT, or MD files
2. **Explore Default Content**: Try the pre-loaded documents for immediate testing
3. **Ask Questions**: Select a document and use the Ask AI feature
4. **Discover Connections**: Visit the Knowledge Graph page to see relationships
5. **Search Content**: Use hybrid search to find relevant information

### Slash Commands
In the editor, use these commands:
- `/summarize` - Get an AI summary of your content
- `/ask [question]` - Ask questions about your text

### Search Modes
- **Hybrid**: Combines keyword and semantic search (recommended)
- **Keyword**: Traditional text matching
- **Semantic**: Meaning-based search using AI embeddings

## Demo Mode

NeuraNotes includes a demo mode that works without OpenAI API:
- Pre-written intelligent responses for default documents
- Full knowledge graph visualization
- Complete search functionality
- Professional user experience

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Yiran (Hazel) Li**
M.E.T @CMU School of Computer Science
📧 [yiranli@andrew.cmu.edu](mailto:yiranli@andrew.cmu.edu)
📱 [510-813-2075](tel:5108132075)

## Acknowledgments

- Built with modern web technologies and AI capabilities
- Inspired by the need for intelligent document management
- Designed for researchers, students, and knowledge workers

---

⭐ **Star this repository if you find it helpful!**
