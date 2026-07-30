// import Navbar from '../components/Navbar';
import Feature from '../components/Feature';
import Audience from '../components/Audience';
import CTASection from '../components/CTASection';
import Process from '../components/Process';
import Hero from '../components/Hero';
import GeneralFoot from '../components/GeneralFoot';
import { ToastContainer } from 'react-toastify';


export default function LandingPage() {
  return (
    <div>
      {/* <Navbar /> */}

      <Hero />

      <div id="process">
        <Process />
      </div>
      <div id="features">
        <Feature />
      </div>
      <div id="audience">
        <Audience />
      </div>
      <CTASection />

      {/* <div className="bg-primary-800 py-8">
        <hr className="border-gray-500 border-t-2 mx-auto w-11/12" />
        <p className="text-gray-300 text-center pt-4">
          © 2025 Know Your Laws. All rights reserved.
        </p>
      </div> */}
      <GeneralFoot />
      <ToastContainer />
    </div>
  );
}
