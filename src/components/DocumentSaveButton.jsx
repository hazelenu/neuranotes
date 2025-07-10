import { supabase } from '../lib/supabase'

const DocumentSaveButton = ({ editor, selectedDocument }) => {
  const handleSave = async () => {
    if (!editor) {
      alert('Editor not available')
      return
    }

    try {
      // Get editor content as JSON
      const content = editor.getJSON()

      if (selectedDocument) {
        // Update existing document
        const { data, error } = await supabase
          .from('documents')
          .update({
            content: content,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedDocument.id)
          .select()

        if (error) {
          throw error
        }

        // Show success message
        alert('Document updated!')
        console.log('Document updated successfully:', data)
      } else {
        // Create new document - prompt for title
        const title = prompt('Enter a title for your document:')

        // Check if user cancelled or entered empty title
        if (!title || title.trim() === '') {
          return
        }

        const { data, error } = await supabase
          .from('documents')
          .insert([
            {
              title: title.trim(),
              content: content
            }
          ])
          .select()

        if (error) {
          throw error
        }

        // Show success message
        alert('Document saved!')
        console.log('Document saved successfully:', data)

        // Clear the editor content for a new document
        editor.commands.clearContent()
      }

    } catch (error) {
      console.error('Error saving document:', error)
      alert(`Error saving document: ${error.message}`)
    }
  }

  return (
    <button
      onClick={handleSave}
      className="bg-sky-300 text-black px-4 py-2 rounded hover:bg-sky-400 transition-colors font-medium"
      disabled={!editor}
    >
      Save Document
    </button>
  )
}

export default DocumentSaveButton
