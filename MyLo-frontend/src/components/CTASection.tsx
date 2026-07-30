import Button from './Button';

export default function CTASection() {
  return (
    <div className="bg-primary-800 text-white py-14 px-4">
      {/* Header Section */}
      <div className="flex items-center justify-center pb-6 md:pb-8">
        <h1 className="text-2xl md:text-4xl font-bold text-center">
          Ready to explore Rwanda’s laws with clarity?
        </h1>
      </div>

      {/* Description Section */}
      <div className="flex items-center justify-center pb-4 md:pb-8">
        <p className="font-light text-base md:text-xl text-center">
          Whether you're a citizen, a startup, or a legal expert MenyaLo helps you
          <br className="hidden md:block" />
          understand, engage, and act with confidence.
        </p>
      </div>

      {/* Buttons Section */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 pb-6 md:pb-8">
        <Button
          variant="outline"
          size="md"
          className="bg-primary-800 text-white px-3 w-full sm:w-auto"
          type="button"
        >
          Get Started
        </Button>
        <Button
          variant="outline"
          size="md"
          className="bg-white text-primary-800 px-3 w-full sm:w-auto"
          type="button"
        >
          Try the AI Assistant
        </Button>
        <Button
          variant="outline"
          size="md"
          className="bg-white text-primary-800 px-3 w-full sm:w-auto"
          type="button"
        >
          Find a Law Firm
        </Button>
      </div>
    </div>
  );
}
