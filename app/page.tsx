import Image from "next/image";

export default function Home() {
  return (
    <main>
      <div>
        <h2>Welcome to the Product Jam Starter Kit</h2>
        <p>
          Feel free to look around, edit the source code and navigate to the
          demos.
        </p>
        <Image
          src="/huji.svg"
          alt="HUJI Logo"
          width="80"
          height="80"
          priority
        />
        <Image
          src="/bezalel.svg"
          alt="Bezalel Logo"
          className="item"
          width="80"
          height="80"
          priority
        />
        <div>
          <h2>Lorem Ipsum</h2>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec
            faucibus sit amet nunc nec vehicula. Fusce ornare nec nulla non
            imperdiet. Fusce vel sodales justo. Sed efficitur arcu lorem, at
            iaculis odio ultricies et. Duis rutrum urna nec elit bibendum, sed
            hendrerit nulla posuere. Vestibulum vestibulum, ante non tincidunt
            posuere, dui arcu lacinia nisl, nec rhoncus massa arcu ac ipsum. Nam
            congue interdum tortor, eu dignissim massa scelerisque vitae. Sed
            ultricies bibendum congue. Praesent non magna id ligula maximus
            luctus. Donec vitae nibh quis neque luctus sagittis et eget nunc.
            Aliquam id ullamcorper lacus. Lorem ipsum dolor sit amet,
            consectetur adipiscing elit. Pellentesque habitant morbi tristique
            senectus et netus et malesuada fames ac turpis egestas. Curabitur
            tempor quis dolor a lacinia.
          </p>
          <ul>
            <li>
              Aliquam maximus tellus sed lacus venenatis, ac cursus eros mollis.
            </li>
            <li>In id ante sed sem pharetra molestie et vitae arcu.</li>
            <li>Cras pharetra turpis at pretium elementum.</li>
            <li>Donec ultrices felis vel lectus auctor iaculis.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
