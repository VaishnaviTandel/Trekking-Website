const Awards = () => {

  return (

    <div className="bg-cyan-500 py-16">

      <h2 className="text-3xl font-bold text-center mb-10 text-white">
        Awards, Affiliations & Press Coverage
      </h2>

      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 px-6 items-center">

        <img
          src="https://upload.wikimedia.org/wikipedia/en/5/5c/Ministry_of_Tourism_India.svg"
          alt="Ministry of Tourism"
        />

        <img
          src="https://upload.wikimedia.org/wikipedia/en/4/4a/Adventure_Tour_Operators_Association_of_India_logo.png"
          alt="ATOAI"
        />

        <img
          src="https://upload.wikimedia.org/wikipedia/commons/8/8c/Incredible_India_logo.png"
          alt="Incredible India"
        />

        <img
          src="https://upload.wikimedia.org/wikipedia/en/3/32/Maharashtra_Tourism_Logo.png"
          alt="Maharashtra Tourism"
        />

      </div>

    </div>

  );

};

export default Awards;