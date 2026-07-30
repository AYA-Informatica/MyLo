import Cards from './Cards';

export default function Audience() {
  return (
    <div className="bg-style-500 pt-8">
      <div className="flex items-center justify-center pb-6 md:pb-8">
        <h1 className="text-2xl md:text-4xl text-primary-900 font-bold text-center">
          Who It’s For
        </h1>
      </div>

      <div className="flex items-center justify-center pb-4 md:pb-8 px-4">
        <p className="font-regular text-base md:text-xl text-black/75 text-center">
          MenyaLo is built for everyone navigating Rwanda’s legal landscape from everyday
          <br className="hidden md:block" /> citizens to emerging startups and trusted law firms.
        </p>
      </div>

      {/* Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4 md:p-12">
        <Cards
          title="Citizens"
          description="Understand your rights, explore laws in plain language, and engage with others in a safe, informed community."
          className="bg-white"
          titleClassName="font-bold text-left text-primary-800"
          descriptionClassName="text-black/80 text-left"
        />
        <Cards
          title="Startups & Organizations"
          description="Post legal needs, connect with verified firms, and access legal guidance without the cost of a full legal department."
          className="bg-white"
          titleClassName="font-bold text-left text-primary-800"
          descriptionClassName="text-black/80 text-left"
        />
        <Cards
          title="Law Firms"
          description="Showcase your expertise, respond to real legal needs, and build trust through verified engagement and legal insights."
          className="bg-white"
          titleClassName="font-bold text-left text-primary-800"
          descriptionClassName="text-black/80 text-left"
        />
      </div>
    </div>
  );
}
