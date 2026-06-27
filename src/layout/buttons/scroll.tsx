import type { BaseElementProps } from "../../types";

export default function ScrollToContent(props?: BaseElementProps) {
  return (<button class="outline scrollBtn">
    <span>Make New Post</span>
    <img src="/icons/new-post.svg" height="20px" width="20px" alt="scroll to making new post" />
  </button>);
}