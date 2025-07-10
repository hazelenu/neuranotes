import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export const useAutoSave = (editor, documentId) => {
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const debounceTimeoutRef = useRef(null)
  const statusTimeoutRef = useRef(null)

  const saveToSupabase = useCallback(async (content) => {
    console.log('saveToSupabase called with documentId:', documentId)

    if (!documentId) {
      console.log('No documentId, skipping save')
      return
    }

    try {
      console.log('Setting status to saving...')
      setSaveStatus('saving')

      console.log('Updating Supabase document:', documentId)
      const { error } = await supabase
        .from('documents')
        .update({
          content: content,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)

      if (error) {
        console.error('Supabase update error:', error)
        throw error
      }

      console.log('Supabase update successful, setting status to saved')
      setSaveStatus('saved')
      console.log('Document auto-saved successfully')

      // Reset to idle after 2 seconds
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current)
      }
      statusTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle')
      }, 2000)

    } catch (error) {
      console.error('Auto-save error:', error)
      setSaveStatus('error')

      // Reset to idle after 2 seconds
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current)
      }
      statusTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle')
      }, 2000)
    }
  }, [documentId])

  const debouncedSave = useCallback((content) => {
    console.log('debouncedSave called, setting 2-second timer...')

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
      console.log('Cleared existing timeout')
    }

    // Set new timeout for 2 seconds
    debounceTimeoutRef.current = setTimeout(() => {
      console.log('Debounce timeout reached, saving to Supabase...')
      saveToSupabase(content)
    }, 2000)
  }, [saveToSupabase])

  useEffect(() => {
    console.log('useAutoSave effect - editor:', !!editor, 'documentId:', documentId)

    if (!editor || !documentId) {
      console.log('Auto-save not initialized - missing editor or documentId')
      return
    }

    const handleUpdate = () => {
      console.log('Editor update detected, starting debounced save...')
      const content = editor.getJSON()
      debouncedSave(content)
    }

    // Listen for editor updates
    editor.on('update', handleUpdate)
    console.log('Auto-save listener attached')

    // Cleanup function
    return () => {
      console.log('Auto-save cleanup')
      editor.off('update', handleUpdate)

      // Clear timeouts
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current)
      }
    }
  }, [editor, documentId, debouncedSave])

  // Manual save function (optional - for immediate saves)
  const saveNow = useCallback(() => {
    if (editor && documentId) {
      // Clear debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      
      const content = editor.getJSON()
      saveToSupabase(content)
    }
  }, [editor, documentId, saveToSupabase])

  return {
    saveStatus,
    saveNow
  }
}
