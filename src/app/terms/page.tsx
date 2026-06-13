"use client";

import React from "react";

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto w-full py-12 px-4 sm:px-6">
      <div className="bg-surface border border-border rounded-3xl p-8 sm:p-12 shadow-sm">
        <h1 className="text-3xl font-black mb-2 tracking-tight">Terms & Conditions</h1>
        <p className="text-zinc-500 mb-8 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="space-y-6 text-zinc-300 leading-relaxed text-sm">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Agreement to Terms</h2>
            <p>These Terms and Conditions constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and VariantFit ("we," "us" or "our"), concerning your access to and use of the VariantFit application as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. User Representations</h2>
            <p>By using the Site, you represent and warrant that: (1) all registration information you submit will be true, accurate, current, and complete; (2) you will maintain the accuracy of such information and promptly update such registration information as necessary; (3) you have the legal capacity and you agree to comply with these Terms and Conditions.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Medical Disclaimer</h2>
            <p>VariantFit is a social fitness application designed for tracking workouts and engaging with a community. We are not medical professionals. The information provided on our platform is for informational purposes only and is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition or fitness regimen.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. User Generated Contributions</h2>
            <p>The Application may invite you to chat, contribute to, or participate in blogs, message boards, online forums, and other functionality, and may provide you with the opportunity to create, submit, post, display, transmit, perform, publish, distribute, or broadcast content and materials to us or on the Application, including but not limited to text, writings, video, audio, photographs, graphics, comments, suggestions, or personal information or other material (collectively, "Contributions").</p>
            <p className="mt-2">Any Contributions you transmit may be treated as non-confidential and non-proprietary. By posting Contributions, you grant VariantFit the right to use, copy, reproduce, and distribute your content across the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Prohibited Activities</h2>
            <p>You may not access or use the Application for any purpose other than that for which we make the Application available. The Application may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Modifications and Interruptions</h2>
            <p>We reserve the right to change, modify, or remove the contents of the Application at any time or for any reason at our sole discretion without notice. We also reserve the right to modify or discontinue all or part of the Application without notice at any time.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
