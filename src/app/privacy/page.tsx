"use client";

import React from "react";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto w-full py-12 px-4 sm:px-6">
      <div className="bg-surface border border-border rounded-3xl p-8 sm:p-12 shadow-sm">
        <h1 className="text-3xl font-black mb-2 tracking-tight">Privacy Policy</h1>
        <p className="text-zinc-500 mb-8 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="space-y-6 text-zinc-300 leading-relaxed text-sm">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Introduction</h2>
            <p>Welcome to VariantFit. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about our policy, or our practices with regards to your personal information, please contact us.</p>
            <p className="mt-2">When you visit our website, mobile application, and use our services, you trust us with your personal information. We take your privacy very seriously. In this privacy notice, we describe our privacy policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Information We Collect</h2>
            <p>We collect personal information that you voluntarily provide to us when registering at the Services expressing an interest in obtaining information about us or our products and services, when participating in activities on the Services or otherwise contacting us.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Personal Information Provided by You: We collect names; email addresses; usernames; passwords; contact preferences; contact or authentication data; billing addresses; and other similar information.</li>
              <li>Health and Fitness Data: Workouts, weight, height, PRs, dietary preferences, and community activity.</li>
              <li>Media: Photos and videos uploaded to your feed or progress gallery.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. How We Use Your Information</h2>
            <p>We use personal information collected via our Services for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>To facilitate account creation and logon process.</li>
              <li>To provide workout analytics and fitness tracking metrics.</li>
              <li>To enable user-to-user communications (direct messaging, comments, friend requests).</li>
              <li>To manage user accounts and maintain security.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Will Your Information Be Shared?</h2>
            <p>We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. Your public profile and feed posts are visible to other users unless you set your account to "Private".</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. How Long Do We Keep Your Information?</h2>
            <p>We keep your information for as long as necessary to fulfill the purposes outlined in this privacy notice unless otherwise required by law. When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize it.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
