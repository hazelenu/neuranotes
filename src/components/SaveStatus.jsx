const SaveStatus = ({ status }) => {
  if (status === 'idle') return null

  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          text: 'Saving...',
          bgColor: 'bg-blue-500/90',
          textColor: 'text-white',
          icon: (
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )
        }
      case 'saved':
        return {
          text: 'Saved',
          bgColor: 'bg-green-500/90',
          textColor: 'text-white',
          icon: (
            <svg className="h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )
        }
      case 'error':
        return {
          text: 'Error saving',
          bgColor: 'bg-red-500/90',
          textColor: 'text-white',
          icon: (
            <svg className="h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
      default:
        return null
    }
  }

  const config = getStatusConfig()
  if (!config) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`${config.bgColor} ${config.textColor} px-4 py-2 rounded-lg shadow-lg border border-white/20 flex items-center gap-2 transition-all duration-300 ease-in-out`}>
        {config.icon}
        <span className="text-sm font-medium">{config.text}</span>
      </div>
    </div>
  )
}

export default SaveStatus
