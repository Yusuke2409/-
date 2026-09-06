// app/page.tsx の例

import CommentItem from "./CommentItem"; // 作成したコンポーネントをインポート

// ...中略...

// 1. コメントを「親コメント」と「返信」に分離する処理
const mainComments = comments.filter((c) => !c.parent_id); // 親コメントのみ

return (
  <div className="space-y-4">
    {mainComments.map((parentComment) => {
      // この親コメントに対する返信だけを抽出
      const childReplies = comments.filter((c) => c.parent_id === parentComment.id);

      return (
        <CommentItem
          key={parentComment.id}
          comment={parentComment}
          replies={childReplies}
          onReply={(parentId) => {
            // 返信対象のIDをセットする処理（フォームの送信先を parentId に切り替える）
            setSelectedParentId(parentId);
          }}
        />
      );
    })}
  </div>
);