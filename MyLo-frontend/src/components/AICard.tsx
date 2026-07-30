import { useState } from 'react';
import { FiZap } from 'react-icons/fi';
import { useGenerateLawOfTheDayMutation } from '../app/api/ai';
import { toast } from 'react-toastify';

export default function AICard() {
  const [generateLaw, { isLoading }] = useGenerateLawOfTheDayMutation();
  const [lawContent, setLawContent] = useState({
    title: 'LAW OF THE DAY',
    content:
      'The statute of limitation sets lawsuit deadlines; missing them ends rights,\nensuring fairness and timely justice.',
  });

  const handleGenerate = async () => {
    try {
      const result = await generateLaw().unwrap();
      setLawContent({
        title: result.data.title || 'LAW OF THE DAY',
        content: result.data.content,
      });
      toast.success('New law of the day generated!');
    } catch (error: any) {
      console.error('Error generating law:', error);
      toast.error(error?.data?.message || 'Failed to generate law of the day');
    }
  };

  return (
    <div className="bg-primary-100 rounded-xl p-6 w-full">
      <h2 className="text-lg font-bold text-primary-800 mb-2">{lawContent.title}</h2>
      <p className="text-secondary-300 text-base mb-4 whitespace-pre-line">{lawContent.content}</p>
      <div className="flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="flex items-center gap-2 bg-primary-800 text-white font-bold px-5 py-2 rounded-md shadow hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <FiZap className="text-lg" />
          )}
          {isLoading ? 'Generating...' : 'Generate'}
        </button>
      </div>
    </div>
  );
}
