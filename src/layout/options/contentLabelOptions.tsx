
type ContentLabelProps = {
  id: string;
};

export default function ContentLabelOptions(props: ContentLabelProps) {
  return (<article>
    <header>Content Label</header>
    <select name="label" id={props.id}>
      <option disabled selected value=""> -- select an option -- </option>
      <option value="None">Safe</option>
      <option value="Suggestive">Suggestive</option>
      <option value="Nudity">Nudity (non-sexual nudity)</option>
      <option value="Adult">Adult (porn)</option>
      <option disabled value="">---</option>
      <option value="Graphic">Graphic Media (gore/violence)</option>
      <option value="GraphicAdult">Adult Graphic Media (gore/violence)</option>
    </select>
    <small>Remember to set the appropriate content label for your content</small>
  </article>);
};