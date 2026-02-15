import React from 'react'

interface ErrorModalProps {
  title: string
  message: string
  onClose: () => void
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  title,
  message,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-slate-900 border-4 border-red-700 rounded-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-red-500 mb-4">{title}</h1>
        <p className="text-white text-lg mb-6 whitespace-pre-wrap">{message}</p>
        <button
          onClick={onClose}
          className="w-full bg-red-700 hover:bg-red-600 text-white px-6 py-3 rounded font-bold transition-colors"
        >
          CLOSE
        </button>
      </div>
    </div>
  )
}
