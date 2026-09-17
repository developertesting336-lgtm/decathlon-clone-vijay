import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import "../../styles/home/CategoryNav.css";

const megaMenuData = {
  sports: {
    title: "All Sports",
    sections: [
      {
        title: "In The Spotlight",
        items: ["Product of the month", "Sport of the month"]
      },
      {
        title: "Outdoor Sports",
        items: [
          "Hiking & Trekking",
          "Camping",
          "Wildlife Watching",
          "Skiing & Snowboarding",
          "Rock Climbing & Mountaineering",
          "Fishing",
          "Horse Riding"
        ]
      },
      {
        title: "Fitness Sports & Yoga",
        items: [
          "Fitness & Gym",
          "Yoga",
          "Kids Sports & Gymnastics",
          "Boxing & Martial Arts",
          "Sportswear",
          "Installation & Service"
        ]
      },
      {
        title: "Water Sports",
        items: [
          "Swimming",
          "Surfing & Beach Sports",
          "Snorkelling & Diving",
          "Kayaking & Stand Up Paddle",
          "Sailing"
        ]
      },
      {
        title: "Racket Sports",
        items: [
          "Badminton",
          "Tennis",
          "Table Tennis",
          "Squash",
          "Padel",
          "Pickleball"
        ]
      },
      {
        title: "Team Sports",
        items: [
          "Football",
          "Basketball",
          "Cricket",
          "Volleyball",
          "Hockey",
          "Rugby",
          "Baseball"
        ]
      },
      {
        title: "Running & Walking",
        items: ["Running", "Walking"]
      },
      {
        title: "Cycling",
        items: ["Cycling", "Cycle Servicing"]
      },
      {
        title: "Roller Sports",
        items: ["Skating", "Skateboarding", "Scooter"]
      },
      {
        title: "Explore A New Sport",
        items: ["Golf", "Darts", "Carrom", "Billiards", "Archery"]
      }
    ]
  },
  men: {
    title: "Men",
    sections: [
      {
        title: "Men Topwear",
        items: [
          "Athleisure",
          "Cotton T-shirt",
          "Polo T-shirt",
          "Tank Tops",
          "Shirts",
          "Swim & Beach Tops",
          "Sweatshirts & Hoodies",
          "Fleeces & Pullovers",
          "T-shirts Under 999"
        ]
      },
      {
        title: "Men Bottomwear",
        items: [
          "Shorts",
          "Track Pants & Joggers",
          "Trousers & Chinos",
          "Waterproof Rain Pants",
          "Tights & Compression",
          "Swim Costumes",
          "Shorts Under 999",
          "Track Pants Under 999"
        ]
      },
      {
        title: "Footwear",
        items: [
          "Sports Shoes",
          "Sandals",
          "Flip Flops & Aqua Shoes",
          "Running Shoes",
          "Walking Shoes",
          "Outdoor Shoes & Boots",
          "Non Marking Shoes",
          "Football Shoes",
          "Socks"
        ]
      },
      {
        title: "Jackets & Sweatshirts",
        items: [
          "Raincoat & Ponchos",
          "Sports Jackets",
          "Winter Jackets",
          "Warm & Waterproof Jackets",
          "Padded & Down Jackets",
          "Windcheaters",
          "Jackets Under 999"
        ]
      },
      {
        title: "Innerwear",
        items: ["Thermals", "Brief Underwear"]
      }
    ]
  },
  women: {
    title: "Women",
    sections: [
      {
        title: "Women Topwear",
        items: [
          "T-shirts",
          "Polo T-shirts",
          "Tank Tops",
          "Crop Tops",
          "Sweatshirt & Hoodies",
          "Fleece & Pullovers",
          "Swim Costumes",
          "Activewear",
          "Raincoats"
        ]
      },
      {
        title: "Women Bottomwear",
        items: [
          "Shorts",
          "Leggings",
          "Track Pants",
          "Trousers",
          "Skirts",
          "Under 999"
        ]
      },
      {
        title: "Women Footwear",
        items: [
          "Sports Shoes",
          "Sandals",
          "Flip Flops",
          "Running Shoes",
          "Walking Shoes",
          "Outdoor Shoes & Boots",
          "Non Marking Shoes",
          "Socks"
        ]
      },
      {
        title: "Women Jackets",
        items: [
          "Sports Jackets",
          "Raincoats",
          "Windcheaters",
          "Sweaters",
          "Winter Jackets",
          "Snow Jackets",
          "Padded & Down Jackets"
        ]
      },
      {
        title: "Women Innerwear",
        items: ["Sports Bra", "Women Thermal Innerwear"]
      }
    ]
  },
  kids: {
    title: "Kids",
    sections: [
      {
        title: "Boys Clothing",
        items: ["T-shirts & Polos", "Shorts & Pants", "Jackets & Sweatshirts", "Swimwear"]
      },
      {
        title: "Girls Clothing",
        items: ["T-shirts & Tops", "Leggings & Shorts", "Jackets", "Swimwear"]
      },
      {
        title: "Kids Footwear",
        items: ["Running Shoes", "Walking Shoes", "Sandals & Flip Flops", "Football Shoes"]
      },
      {
        title: "Kids Sports Equipment",
        items: ["Cycles & Helmets", "Skates & Scooters", "Rackets & Balls"]
      }
    ]
  }
};

const CategoryNav = () => {
  const [activeCategory, setActiveCategory] = useState(null);
  const navRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setActiveCategory(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleCategoryHover = (key) => {
    setActiveCategory(key);
  };

  const handleCategoryClick = (key) => {
    setActiveCategory(activeCategory === key ? null : key);
  };

  return (
    <div className="category-nav-wrapper" ref={navRef} onMouseLeave={() => setActiveCategory(null)}>
      <div className="category-nav">
        <div className="category-links">
          <button
            type="button"
            className={`category-tab-btn ${activeCategory === "sports" ? "active" : ""}`}
            onMouseEnter={() => handleCategoryHover("sports")}
            onClick={() => handleCategoryClick("sports")}
          >
            All Sports
          </button>
          <button
            type="button"
            className={`category-tab-btn ${activeCategory === "men" ? "active" : ""}`}
            onMouseEnter={() => handleCategoryHover("men")}
            onClick={() => handleCategoryClick("men")}
          >
            Men
          </button>
          <button
            type="button"
            className={`category-tab-btn ${activeCategory === "women" ? "active" : ""}`}
            onMouseEnter={() => handleCategoryHover("women")}
            onClick={() => handleCategoryClick("women")}
          >
            Women
          </button>
          <button
            type="button"
            className={`category-tab-btn ${activeCategory === "kids" ? "active" : ""}`}
            onMouseEnter={() => handleCategoryHover("kids")}
            onClick={() => handleCategoryClick("kids")}
          >
            Kids
          </button>
        </div>

        <div className="delivery-location">
          <span>Delivery to</span>{" "}
          <Link to="/delivery">
            Bangalore Central, Bangalore, 560001, Karnataka
          </Link>
        </div>
      </div>

      {activeCategory && megaMenuData[activeCategory] && (
        <div className="megamenu-overlay">
          <div className="megamenu-content">
            <h2 className="megamenu-title">{megaMenuData[activeCategory].title}</h2>
            <div className="megamenu-grid">
              {megaMenuData[activeCategory].sections.map((section, idx) => (
                <div className="megamenu-section" key={idx}>
                  <h3 className="megamenu-section-title">{section.title}</h3>
                  <ul className="megamenu-list">
                    {section.items.map((item, itemIdx) => (
                      <li key={itemIdx}>
                        <Link
                          to={`/products?search=${encodeURIComponent(item)}`}
                          onClick={() => setActiveCategory(null)}
                        >
                          {item}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryNav;