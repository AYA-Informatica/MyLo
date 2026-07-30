// import SearchBar from './SearchBar';
import Cards from './Cards';
import { motion } from 'framer-motion';
import { IoSearch } from 'react-icons/io5';
import { LiaMagicSolid } from 'react-icons/lia';
import { GoVerified } from 'react-icons/go';
import { TbTopologyStar } from 'react-icons/tb';

export default function Process() {
  return (
    <div className="">
      {/* cards */}
      <div className="bg-style-500 py-15">
        <div className=" flex items-center justify-center pb-8">
          <h1 className="text-4xl text-primary-900 font-semibold">How MenyaLo Works</h1>
        </div>
        <div className="flex items-center justify-center ">
          <p className="font-regular text-xl text-black/75 text-center">
            Legal clarity in four simple steps powered by AI, verified experts, and community <br />{' '}
            insight.
          </p>
        </div>
        <div className=" flex flex-wrap gap-10 p-6 md:p-12 px-8">
          <motion.div
            whileHover={{ scale: 1.05, boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.2)' }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex-1 min-w-[300px]   rounded-lg"
          >
            <Cards
              title="Explore the Gazette"
              description="Search, filter, and read laws by origin, status, and domain. Get AI-generated summaries for quick understanding."
              icon={
                <div className="grid place-items-center">
                  <IoSearch className="text-4xl text-primary-800" />
                </div>
              }
              className=" text-md bg-white flex-1 min-w-[300px] shadow py-20 h-[353px]"
              titleClassName="text-primary-800 font-regular"
              descriptionClassName="text-gray-600 "
            />
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05, boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.2)' }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex-1 min-w-[300px] h-full rounded-lg"
          >
            <Cards
              title="Ask the AI Assistant"
              description="Describe your legal situation and receive contextual summaries, references, and guidance based on the Rwanda Law Gazette."
              icon={
                <div className="grid place-items-center">
                  <LiaMagicSolid className="text-4xl text-primary-800" />
                </div>
              }
              className=" text-md bg-white flex-1 min-w-[300px] shadow py-20"
              titleClassName="text-primary-800 font-regular"
              descriptionClassName="text-gray-600"
            />
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05, boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.2)' }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex-1 min-w-[300px] h-full rounded-lg"
          >
            <Cards
              title="Connect with Verified Firms"
              description="Browse law firms by specialty and location. Verified firms post insights and respond to legal needs from startups and citizens."
              icon={
                <div className="grid place-items-center">
                  <GoVerified className="text-4xl text-primary-800" />
                </div>
              }
              className=" text-md bg-white flex-1 min-w-[300px] shadow py-20"
              titleClassName="text-primary-800 font-regular"
              descriptionClassName="text-gray-600"
            />
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05, boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.2)' }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex-1 min-w-[300px] h-full rounded-lg"
          >
            <Cards
              title="Join the Community"
              description="Post questions, share experiences, and engage with others. Upvote helpful content and report abuse to keep the space safe."
              icon={
                <div className="grid place-items-center">
                  <TbTopologyStar className="text-4xl text-primary-800" />
                </div>
              }
              className=" text-md bg-white flex-1 min-w-[300px] shadow py-20"
              titleClassName="text-primary-800 font-regular"
              descriptionClassName="text-gray-600"
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
