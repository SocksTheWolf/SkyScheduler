export default function NavTags() {
  return (
    <div class="container">
      <nav>
        <ul>
          <li><h3>SkyScheduler</h3></li>
        </ul>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/signup">Create an Account</a></li>
          <li><a role="button" class="secondary" href="/login">Login</a></li>
        </ul>
      </nav>
    </div>
  );
}