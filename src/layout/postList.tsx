import { Context } from "hono";
import { html, raw } from "hono/html";
import { getPostsForUser } from "../utils/dbQuery";

function formatDate(date:string) {
  return new Date(date).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
  });
}

type ScheduledPostProps = {
  id: string;
  content: string;
  posted: boolean;
  scheduledDate: string;
};

export function ScheduledPost({
  id,
  content,
  posted,
  scheduledDate
} : ScheduledPostProps) {
  return html`
  <div class="border border-gray-200 rounded px-3 py-2 bg-white">
    <div class="flex gap-2 items-center">
      <p class="text-gray-800 flex-1 truncate">${content}</p>
      ${posted ? '' : raw(`<form action="/posts/${id}/delete" method="POST">
        <button type="submit" class="btn btn-sm btn-error btn-outline px-1 py-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" class="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      </form>`)}
    </div>
    <p class="text-sm text-gray-500 mt-1">${posted ? 'Posted on:' : 'Scheduled for:'} ${formatDate(scheduledDate)}</p>
  </div>`;
};

type ScheduledPostListProps = {
  ctx?: Context;
};

export const ScheduledPostList = async ({ctx}: ScheduledPostListProps) => {
  if (ctx !== undefined) {
    const response:Object[]|null = await getPostsForUser(ctx?.env);
    if (response !== null) {
      if (response.length > 0) {
        return (
          <>
          {response.map((message:any) => {
            const data:ScheduledPostProps = {
              id: message.uuid,
              content: message.content,
              posted: message.posted,
              scheduledDate: message.scheduledDate
            };
            return <ScheduledPost {...data} />;
          })}
          </>
        );
      }
    }
  }

  return (
    <div class="border border-gray-200 rounded px-3 py-2 bg-white">
      <p class="text-gray-800">No posts scheduled</p>
    </div>
  );
};
