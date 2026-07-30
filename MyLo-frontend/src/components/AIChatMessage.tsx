import type { AIMessage } from '../app/api/ai';
import { FiUser, FiZap } from 'react-icons/fi';

interface AIChatMessageProps {
  message: AIMessage;
}

export default function AIChatMessage({ message }: AIChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-primary-800 rounded-full flex items-center justify-center">
          <FiZap className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-primary-800 text-white ml-auto'
              : 'bg-white border border-gray-200 text-gray-800'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          <FiUser className="w-4 h-4 text-gray-600" />
        </div>
      )}
    </div>
  );
}
