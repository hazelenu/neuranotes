import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const SelectionMenuPluginKey = new PluginKey('selectionMenu')

export const SelectionMenu = Extension.create({
  name: 'selectionMenu',

  addOptions() {
    return {
      onRightClick: () => {},
    }
  },

  addProseMirrorPlugins() {
    const options = this.options

    return [
      new Plugin({
        key: SelectionMenuPluginKey,
        state: {
          init() {
            return {
              hasSelection: false,
              selectedText: '',
              range: null,
            }
          },
          apply(tr, prev, oldState, newState) {
            const { selection } = newState
            const { from, to } = selection

            // Check if there's a text selection (not just cursor)
            const hasSelection = from !== to && !selection.empty
            const selectedText = hasSelection ? newState.doc.textBetween(from, to) : ''

            console.log('Selection state updated:', { hasSelection, selectedText: selectedText.substring(0, 50), from, to })

            // Only store selection state, don't auto-show menu
            return {
              hasSelection,
              selectedText,
              range: hasSelection ? { from, to } : null,
            }
          },
        },
        props: {
          handleDOMEvents: {
            contextmenu: (view, event) => {
              // Get current selection directly from view
              const { selection } = view.state
              const { from, to } = selection
              const hasSelection = from !== to && !selection.empty
              const selectedText = hasSelection ? view.state.doc.textBetween(from, to) : ''

              console.log('Context menu event - direct selection check:', {
                hasSelection,
                selectedText: selectedText.substring(0, 50),
                textLength: selectedText.length,
                from,
                to
              })

              if (hasSelection && selectedText && selectedText.length > 2) {
                console.log('Preventing default context menu and showing custom menu')
                // Prevent default context menu
                event.preventDefault()

                // Calculate menu position from mouse position
                const editorRect = view.dom.getBoundingClientRect()

                // Notify component to show menu
                options.onRightClick({
                  hasSelection: true,
                  selectedText: selectedText,
                  range: { from, to },
                  position: {
                    x: event.clientX - editorRect.left,
                    y: event.clientY - editorRect.top,
                  }
                })

                return true
              } else {
                console.log('Not showing menu - no selection or text too short:', { hasSelection, textLength: selectedText.length })
              }

              return false
            },
          },
        },
      }),
    ]
  },
})
