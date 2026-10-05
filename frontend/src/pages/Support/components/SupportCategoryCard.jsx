import React from "react";
import { Link } from "react-router-dom";
import {
  FiShoppingBag,
  FiCreditCard,
  FiTruck,
  FiRotateCcw,
  FiRepeat,
  FiShield,
  FiUser,
  FiBox,
  FiMapPin,
  FiTool,
  FiTag,
  FiHeadphones,
  FiChevronRight,
} from "react-icons/fi";
import "../Support.css";

// Map category icon keys to suitable react-icons/fi components
const ICON_COMPONENTS = {
  orders: FiShoppingBag,
  payments: FiCreditCard,
  delivery: FiTruck,
  returns_refunds: FiRotateCcw,
  returns: FiRotateCcw,
  exchange: FiRepeat,
  warranty: FiShield,
  account: FiUser,
  products: FiBox,
  stores: FiMapPin,
  installation: FiTool,
  services: FiTool,
  offers: FiTag,
  contact: FiHeadphones,
};

const SupportCategoryCard = ({ category, onClick }) => {
  if (!category) return null;

  const IconComponent =
    ICON_COMPONENTS[category.icon] ||
    FiShoppingBag;

  const categoryId = category._id || category.id;
  const title = category.name || category.title;

  return (
    <Link
      to={`/support/category/${categoryId}`}
      className="support-category-card"
      onClick={() => onClick && onClick(category)}
      aria-label={`${title} - ${category.description}`}
    >
      <div className="support-category-icon-box" aria-hidden="true">
        <IconComponent className="support-category-icon" />
      </div>

      <div className="support-category-card-body">
        <div className="support-category-card-title-row">
          <h3 className="support-category-card-title">{title}</h3>
          <FiChevronRight
            className="support-category-card-chevron"
            aria-hidden="true"
          />
        </div>
        <p className="support-category-card-desc">{category.description}</p>
      </div>
    </Link>
  );
};

export default SupportCategoryCard;
