// Pre-written demo answers for Ask AI functionality
// These work without OpenAI API for demonstration purposes

export const demoAnswers = {
  // Answers for "The Turing Test: A Brief Introduction"
  turingTest: {
    "What is the main topic of this document?": "This document explores the Turing Test, a foundational concept in artificial intelligence proposed by Alan Turing in 1950. It explains how the test measures machine intelligence through conversational ability rather than attempting to define consciousness itself.",

    "Can you summarize the key points?": "Key points include: (1) Alan Turing proposed the Turing Test in 1950 as an alternative to asking 'Can machines think?', (2) The test involves a human evaluator conversing with both a human and machine without knowing which is which, (3) Success is measured by the machine's ability to produce responses indistinguishable from humans, (4) The test focuses on observable behavior rather than internal consciousness, and (5) It remains a compelling benchmark for AI development today.",

    "What challenges are mentioned?": "The document mentions several challenges: defining what constitutes 'thinking' in machines, the philosophical complexity of consciousness, the need for machines to demonstrate not just factual knowledge but nuanced dialogue, creativity, and appropriate emotional responses. It also notes ongoing debates about whether conversational ability alone constitutes true intelligence.",

    "What solutions are proposed?": "Turing's key solution was reframing the question from 'Can machines think?' to a practical behavioral test. Instead of trying to define thinking or consciousness, the Turing Test focuses on whether machines can demonstrate intelligent behavior that's indistinguishable from humans in conversation. This practical approach has guided AI development toward sophisticated natural language processing systems.",

    "What are the most important takeaways?": "The most important takeaways are: (1) The Turing Test shifted AI research from philosophical questions to practical behavioral measures, (2) It established conversation as a key benchmark for machine intelligence, (3) The test has driven development of advanced natural language processing, (4) It remains relevant despite modern AI advances, and (5) Turing's 1950s vision continues to inspire and guide AI development as both a technical challenge and philosophical touchstone."
  },

  // Answers for "Steve Jobs at Stanford (2005)"
  steveJobs: {
    "What is the main topic of this document?": "This document covers Steve Jobs' famous 2005 commencement speech at Stanford University, where he shared three personal stories about connecting the dots, love and loss, and death. The speech became legendary for its wisdom about following your passion and living authentically.",

    "Can you summarize the key points?": "Jobs shared three stories: (1) 'Connecting the dots' - how dropping out of college led him to a calligraphy class that later inspired Apple's typography, teaching that you must trust dots will connect in your future, (2) 'Love and loss' - being fired from Apple freed him to enter his most creative period, founding NeXT and Pixar, and (3) 'Death' - his cancer diagnosis clarified priorities and taught him that remembering mortality helps avoid the trap of thinking you have something to lose.",

    "What challenges are mentioned?": "Jobs discussed several challenges: being fired from the company he co-founded (Apple), facing a cancer diagnosis, the uncertainty of dropping out of college, and the general challenge of making decisions when you can't see how they'll connect to your future. He also mentioned the challenge of staying true to your calling when the path seems uncertain.",

    "What solutions are proposed?": "Jobs proposed several solutions: (1) Trust that the dots will connect in your future, even when you can't see how, (2) Follow your gut, destiny, life, or karma, (3) View setbacks as liberation and opportunities for creativity, (4) Use awareness of mortality to clarify priorities and make authentic decisions, and (5) 'Stay hungry, stay foolish' - maintain curiosity and willingness to take risks.",

    "What are the most important takeaways?": "Key takeaways include: (1) You can't connect the dots looking forward, only backwards, so trust in something, (2) Apparent failures can lead to your most creative periods, (3) Facing mortality clarifies what's truly important, (4) Follow your intuition and have courage to pursue your true calling, (5) Success often emerges from setbacks, creativity flourishes in uncertainty, and (6) The importance of combining vulnerability with wisdom in leadership."
  },

  // Answers for "Getting Started with NeuraNotes"
  neuraNotes: {
    "What is the main topic of this document?": "This document is a comprehensive guide to NeuraNotes, an AI-enhanced note-taking platform. It explains the key features including document upload, slash commands, knowledge graphs, and hybrid search functionality, serving as an onboarding guide for new users.",

    "Can you summarize the key points?": "Key points include: (1) NeuraNotes is an AI-enhanced note-taking platform that transforms document interaction, (2) Users can upload PDF, TXT, and Markdown files to build a personal knowledge base, (3) Slash commands like '/summarize' and '/ask' provide AI-powered analysis, (4) The knowledge graph feature visualizes relationships and concepts across documents, (5) Hybrid search combines keyword and semantic search for powerful content discovery, and (6) The platform grows more powerful as users add more content.",

    "What challenges are mentioned?": "The document addresses challenges users might face: finding relevant content in large document collections, remembering exact words when searching, discovering hidden patterns across multiple documents, and effectively utilizing AI capabilities for research and creative exploration. It also mentions the learning curve of understanding the platform's various features.",

    "What solutions are proposed?": "NeuraNotes offers several solutions: (1) Automatic document processing for search and AI analysis, (2) Slash commands for easy access to AI functions, (3) Knowledge graph visualization to reveal hidden connections, (4) Hybrid search that understands context and meaning, not just keywords, (5) RAG (retrieval-augmented generation) for intelligent document querying, and (6) A growing AI assistant that becomes more powerful with each document added.",

    "What are the most important takeaways?": "Important takeaways are: (1) NeuraNotes transforms static documents into an interactive knowledge assistant, (2) The platform combines multiple AI technologies (RAG, knowledge graphs, semantic search) in one tool, (3) Users should start by uploading documents to experience the full power, (4) The system grows more intelligent and useful as the knowledge base expands, (5) It's designed for research, studying, and creative exploration, and (6) This represents the future of intelligent note-taking where AI enhances human thinking and research processes."
  }
}

// Function to get demo answer based on document title and question
export const getDemoAnswer = (documentTitle, question) => {
  let answers = null
  
  if (documentTitle.includes("Turing Test")) {
    answers = demoAnswers.turingTest
  } else if (documentTitle.includes("Steve Jobs")) {
    answers = demoAnswers.steveJobs
  } else if (documentTitle.includes("Getting Started")) {
    answers = demoAnswers.neuraNotes
  }
  
  if (answers && answers[question]) {
    return answers[question]
  }
  
  // Fallback for questions not in our predefined set
  return `This is a demo response for "${question}" about "${documentTitle}". In the full version with OpenAI API, this would provide a detailed AI-generated answer based on the document content. The demo shows how NeuraNotes can provide intelligent responses to user questions about their documents.`
}

// Check if a document has demo answers available
export const hasDemoAnswers = (documentTitle) => {
  return documentTitle.includes("Turing Test") || 
         documentTitle.includes("Steve Jobs") || 
         documentTitle.includes("Getting Started")
}
