"use client";

import { NestedReplies } from "@/components/shared/NestedReplies";

export function ReplySection({ questionId, questionUserId }: { questionId: string; questionUserId: string }) {
  return (
    <NestedReplies
      collectionPath={`questions/${questionId}/replies`}
      notifyUserId={questionUserId}
      notifyType="reply"
      notifyLink="/help"
      placeholder="Write a response..."
    />
  );
}
