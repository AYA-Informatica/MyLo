import Layout from '../components/Layout';
import profile from '../assets/profile.jpg';
import Button from '../components/Button';
import { MdEmail } from 'react-icons/md';
import { FaLinkedin } from 'react-icons/fa';
import { BsFillTelephoneFill } from 'react-icons/bs';
import { RiMessageFill } from 'react-icons/ri';
import { MdArrowForwardIos } from 'react-icons/md';
import { FaComments } from 'react-icons/fa';
import { BiSolidLike } from 'react-icons/bi';
import { BsFillLockFill } from 'react-icons/bs';
import { IoIosNotifications } from 'react-icons/io';
import  Cards from '../components/Cards';
import { TbMessages } from 'react-icons/tb';
import { FaHeart } from 'react-icons/fa';

export default function Userprofile() {
  return (
    <Layout>
      <div className="mt-5 bg-primary-100">
        <div className="flex flex-col sm:flex-row justify-between items-start text-gray-300 py-16 px-4 sm:px-16">
          <div className="w-full sm:w-1/2 text-left border-b sm:border-b-0 sm:border-r border-gray-400 px-4 sm:pl-10 pb-8 sm:pb-0">
            {/* Profile Image */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden mb-4 mx-auto sm:mx-0">
              <img src={profile} alt="Profile" className="w-full h-full object-cover" />
            </div>

            {/* User Information */}
            <div className="text-center sm:text-left">
              <p className="font-medium text-black/85">Aline Uwase</p>
              <p className="font-medium text-black/85">@alineuwase</p>
            </div>

            {/* Edit Profile and Log Out Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Button
                variant="outline"
                size="sm"
                className="bg-primary-900 text-white px-20 w-full sm:w-auto"
                type="button"
              >
                Edit Profile
              </Button>
             
            </div>

            {/* About Me Section */}
            <div className="mt-6">
              <h4 className="font-semibold text-primary-800 text-lg sm:text-xl">About Me</h4>
              <p className="mt-2 text-black text-sm sm:text-base">
                Aspiring Legal professionals with a passion for justice and human rights. <br />
                Committed to making a positive impact through the law.
              </p>
            </div>

            {/* Personal Information Section */}
            <div className="mt-6">
              <h4 className="font-semibold text-primary-800 text-lg sm:text-xl">
                Personal Information
              </h4>
              <div className="flex items-center gap-x-2 mt-2">
                <MdEmail className="text-primary-800" />
                <p className="text-black text-sm sm:text-base">alineuwace@gmail.com</p>
              </div>
              <div className="flex items-center gap-x-2 mt-2">
                <BsFillTelephoneFill className="text-primary-800" />
                <p className="text-black text-sm sm:text-base">+250 785 360 125</p>
              </div>
              <div className="flex items-center gap-x-2 mt-2">
                <FaLinkedin className="text-primary-800" />
                <p className="text-black text-sm sm:text-base">LinkedIn</p>
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="w-full sm:w-1/3 text-left pr-26 mt-8 sm:mt-0">
            <h4 className="font-semibold  text-primary-800 text-md">Community Contribution</h4>
            <div className="flex items-center gap-x-4 pb-5">
              <RiMessageFill className="text-primary-900 text-xl" />
              <div className="flex justify-between items-center w-full">
                <div>
                  <p className="text-md font-medium text-black">Post</p>
                  <p className="text-sm font-light text-gray-500">6 Posts</p>
                </div>
                <MdArrowForwardIos className="text-primary-900 text-md" />
              </div>
            </div>
            <div className="flex items-center pb-5 gap-x-4">
              <FaComments className="text-primary-900 text-xl" />
              <div className="flex justify-between items-center w-full">
                <div>
                  <p className="text-md font-medium text-black">Comments</p>
                  <p className="text-sm font-light text-gray-500">12 comments</p>
                </div>
                <MdArrowForwardIos className="text-primary-900 text-md" />
              </div>
            </div>
            <div className="flex items-center pb-5 gap-x-4">
              <BiSolidLike className="text-primary-900 text-xl" />
              <div className="flex justify-between items-center w-full">
                <div>
                  <p className="text-md font-medium text-black">Upvoted</p>
                  <p className="text-sm font-light text-gray-500">25 Upvoted</p>
                </div>
                <MdArrowForwardIos className="text-primary-900 text-md" />
              </div>
            </div>
            <h4 className="font-semibold text-primary-800 text-md py-2 pt-4">Security & Setting</h4>
            <div className="flex items-center pb-5 gap-x-4">
              <BsFillLockFill className="text-primary-900 text-xl" />
              <div className="flex justify-between items-center w-full">
                <div>
                  <p className="text-md font-medium text-black/80">Change Person</p>
                </div>
                <MdArrowForwardIos className="text-primary-900 text-md" />
              </div>
            </div>
            <div className="flex items-center pb-5 gap-x-4">
              <IoIosNotifications className="text-primary-900 text-xl" />
              <div className="flex justify-between items-center w-full">
                <div>
                  <p className="text-md font-medium text-black/80">Notification Preferences</p>
                </div>
                <MdArrowForwardIos className="text-primary-900 text-md" />
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="flex flex-col items-center justify-center text-center pb-8">
            <h1 className="text-3xl text-primary-900 font-semibold">Community Status</h1>
            <p className="text-gray-600 mt-2">Your contribution and engagement</p>
          </div>
          <div className="flex flex-wrap gap-10 p-6 md:p-12 px-8 justify-center">
            <Cards
              title=""
              description="24 posts"
              icon={
                <div className="grid place-items-center">
                  <TbMessages className="text-3xl text-primary-800" />
                </div>
              }
              className="text-md bg-style-500 flex-1 w-40 shadow py-20"
              descriptionClassName="text-gray-600"
            />
            <Cards
              title=""
              description="24 posts"
              icon={
                <div className="grid place-items-center">
                  <FaComments className="text-3xl text-primary-800" />
                </div>
              }
              className="text-md bg-style-500 flex-1 w-40 shadow py-20"
              descriptionClassName="text-gray-600"
            />
            <Cards
              title=""
              description="24 posts"
              icon={
                <div className="grid place-items-center">
                  <FaHeart className="text-3xl text-primary-800" />
                </div>
              }
              className="text-md bg-style-500 flex-1 w-40 shadow py-20"
              descriptionClassName="text-gray-600"
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
