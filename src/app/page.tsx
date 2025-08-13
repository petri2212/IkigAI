'use client';
import React from 'react';
import Header from './components/header';

export default function HomePage() {
  return (
    <><Header loading={false} /><main className="bg-white text-gray-800">
      {/* Section 1 - Ikigai */}
      <section className="min-h-screen flex flex-col justify-center px-6 py-20 bg-gradient-to-b from-white to-gray-100">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-x-24 items-center">

          {/* Text */}
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Your Ikigai. Your Future.
            </h1>
            <p className="text-lg md:text-xl leading-relaxed text-gray-700">
              The Japanese concept of <strong>Ikigai</strong> represents “what gives life meaning.”
              Our project is rooted in this idea, aiming to help you find not just a job,
              but a meaningful career path built around your
              <strong> values, passions, and personal fulfillment</strong>.
            </p>
          </div>

          {/* Image */}
          <div className="flex justify-center">
            <img
              src="/images/ikigai1.png"
              alt="Ikigai Visual"
              className="w-full max-w-md md:max-w-lg lg:max-w-xl object-contain rounded-2xl" />
          </div>
        </div>
      </section>

      {/* Section 2 - How It Works */}
      <section
        className="bg-white py-20 px-6 md:px-12 lg:px-24 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/wallpaper1.png')" }}
      >
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 text-center mb-16">
            How our application works
          </h2>

          {/* Career Match Block */}
          <div className="mb-20">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Career Match</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              There are two possible paths:
            </p>

            <div className="grid md:grid-cols-2 gap-8 mb-10">
              <div className="bg-gray-50 p-6 rounded-xl shadow-sm border border-gray-200">
                <h4 className="font-semibold text-gray-800 text-lg mb-2">Simplified Path</h4>
                <p className="text-gray-700 leading-relaxed">
                  The user provides only partial information, such as skills, interests, academic background, or simply their resume.
                  In this case, they move directly to the next phase, “Career Coach,” but with less personalized guidance.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl shadow-sm border border-gray-200">
                <h4 className="font-semibold text-gray-800 text-lg mb-2">Complete Path</h4>
                <p className="text-gray-700 leading-relaxed">
                  The user fills in all the requested information, including personality traits. This approach allows for a more accurate profile and more effective support in the next phase.
                </p>
              </div>
            </div>
          </div>

          {/* Career Coach Block */}
          <div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Career Coach</h3>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-6 rounded-xl shadow-sm border border-gray-200">
                <h4 className="font-semibold text-gray-800 text-lg mb-2">Goal Orientation</h4>
                <p className="text-gray-700 leading-relaxed">
                  Practical support in setting realistic and inspiring goals, from the first interview to long-term career development.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl shadow-sm border border-gray-200">
                <h4 className="font-semibold text-gray-800 text-lg mb-2">Strategic Planning</h4>
                <p className="text-gray-700 leading-relaxed">
                  Suggestions and tools to structure the steps needed to reach your goals, with continuous updates along the way.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl shadow-sm border border-gray-200">
                <h4 className="font-semibold text-gray-800 text-lg mb-2">Personal and Professional Growth</h4>
                <p className="text-gray-700 leading-relaxed">
                  Ongoing support to develop new skills, improve motivation, and stay aligned with your core values.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main></>
  );
}
