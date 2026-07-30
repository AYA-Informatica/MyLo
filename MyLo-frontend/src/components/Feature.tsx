import Cards from './Cards';
import { IoIosCheckmarkCircleOutline } from 'react-icons/io';

// import { IoIosCheckmarkCircleOutline } from 'react-icons/io';

export default function Feature() {
  return (
    <div className="bg-white py-10 md:py-15">
      <div className="flex items-center justify-center pb-6 md:pb-8">
        <h1 className="text-2xl md:text-4xl text-primary-900 font-bold text-center">
          Platform Features
        </h1>
      </div>

      <div className="flex items-center justify-center pb-6 md:pb-8 px-4">
        <p className="font-regular text-base md:text-xl text-black/75 text-center">
          MenyaLo empowers every user citizens, startups, and law firms with tools{' '}
          <br className="hidden md:block" /> to navigate, understand, and engage with Rwanda’s legal
          landscape.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6 justify-center mt-6 md:mt-10 px-8">
        <Cards
          title="For Citizens"
          bulletPoints={[
            'Search and explore the Rwanda Law Gazette',
            'Receive AI-generated law summaries',
            'Access personalized legal feeds',
            'Engage in community discussions',
            'Upvote and report posts',
          ]}
          bulletIcon={<IoIosCheckmarkCircleOutline className="text-green-500 text-lg" />}
          className="bg-style-500 text-primary-800 w-full md:w-1/3"
          titleClassName="text-primary-800 text-lg md:text-xl font-bold text-left"
          bulletPointClassName="text-black/85 text-sm md:text-md"
        />
        <Cards
          title="For Organizations"
          bulletPoints={[
            'Register and get verified',
            'Post legal needs and receive firm responses',
            'Browse laws and firms by sector',
            'Use the AI assistant for legal guidance',
            'Participate in community support',
          ]}
          bulletIcon={<IoIosCheckmarkCircleOutline className="text-green-500 text-lg" />}
          className="bg-style-500 text-primary-800 w-full md:w-1/3"
          titleClassName="text-primary-800 text-lg md:text-xl font-bold text-left"
          bulletPointClassName=" list-disc text-black/85 text-sm md:text-md"
        />
        <Cards
          title="For Law Firms"
          bulletPoints={[
            'Register and verify your practice',
            'List specialties and publish legal insights',
            'Respond to startup and citizen posts',
            'Annotate laws and flag misinformation',
            'Get recommended to relevant users',
          ]}
          bulletIcon={<IoIosCheckmarkCircleOutline className="text-green-500 text-lg" />}
          className="bg-style-500 text-primary-800 w-full md:w-1/3"
          titleClassName="text-primary-800 text-lg md:text-xl font-bold text-left"
          bulletPointClassName=" list-disc text-black/85 text-sm md:text-md before:content-[']"
        />
      </div>
    </div>
  );
}
