# Decathlon Clone

A full-stack e-commerce application inspired by Decathlon, built with React, Node.js, Express, MongoDB, Stripe, Cloudinary, and Socket.IO.

## Project Overview

The Decathlon Clone provides a complete online shopping experience with separate customer and admin functionality.

Customers can browse products, manage their cart and wishlist, save addresses, choose delivery options, and place orders using Stripe or Cash on Delivery.

Admins can manage products, categories, banners, homepage sections, and orders through the admin panel.

## Features

### Customer

- User Registration
- OTP-based Registration
- OTP-based Login
- Product Listing
- Product Details
- Product Search
- Category Filtering
- Price Filtering
- Product Size Selection
- Wishlist
- Add to Cart
- Update Cart Quantity
- Remove Cart Items
- Address Management
- Delivery Option Selection
- Stripe Payment
- Cash on Delivery
- Order Placement
- Order History
- Real-time Updates

### Admin

- Admin Login
- Admin Authentication
- Product Management
- Add Product
- Edit Product
- Delete Product
- Multiple Product Images
- Category Management
- Banner Management
- Homepage Section Management
- Order Management
- Product Stock Management
- Product Status Management
- Image Upload
- Cloudinary Image Storage

## Technology Stack

### Frontend

- React.js
- React Router
- Axios
- React Icons
- React Hot Toast

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Multer
- Socket.IO

### Services

- MongoDB Atlas
- Cloudinary
- Stripe
- Vercel

## Project Structure

```text
decathlonClone/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── admin/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── config/
│   │   └── cloudinary.js
│   │
│   ├── controllers/
│   ├── middleware/
│   │   ├── adminMiddleware.js
│   │   ├── authMiddleware.js
│   │   └── uploadMiddleware.js
│   │
│   ├── models/
│   ├── routes/
│   ├── socket/
│   ├── utils/
│   │   └── uploadToCloudinary.js
│   │
│   ├── app.js
│   ├── server.js
│   └── package.json
│
└── README.md
```

## Environment Variables

Create a `.env` file inside the `backend` directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret_key

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

> **Important**: Never commit `.env` files to GitHub. Ensure `.gitignore` includes:
> ```text
> .env
> .env.local
> node_modules/
> ```

## Installation

### Backend Setup

```bash
cd backend
npm install
```

Start development server:

```bash
npm start
# or
nodemon server.js
```

### Customer Frontend Setup

```bash
cd frontend
npm install
npm start
```

### Admin Frontend Setup

```bash
cd admin-frontend
npm install
npm start
```

## Image Upload

Product, category, and banner images are uploaded using Multer and stored permanently in Cloudinary.

```text
Admin
  ↓
Select Image
  ↓
Multer (Memory Buffer)
  ↓
Cloudinary
  ↓
HTTPS Image URL
  ↓
MongoDB
  ↓
Frontend UI
```

This ensures uploaded images remain persistently available across server restarts and serverless deployments (e.g. Vercel).

## Payment Flow

The application supports both Stripe and Cash on Delivery (COD):

### Stripe Payment Flow

```text
Customer → Checkout → Payment Intent → Stripe → Payment Confirmation → Order Created
```

### Cash on Delivery (COD) Flow

```text
Customer → Checkout → Select COD → Order Created → Admin Order Management
```

## Order Flow

```text
Product → Add to Cart → Address Selection → Delivery Option → Payment → Order Created → Order History → Admin Order Management
```

## API Modules

The backend provides RESTful API endpoints for:

- `/api/auth`
- `/api/categories`
- `/api/products`
- `/api/cart`
- `/api/wishlist`
- `/api/addresses`
- `/api/orders`
- `/api/payment`
- `/api/banners`
- `/api/homepage-sections`
- `/api/registration`
- `/api/login`

## Real-Time Features

Socket.IO is used for real-time updates across the client and admin applications:

```text
Admin Action → Backend → Socket.IO Event → Connected Clients → UI Update
```

## Deployment

- **Backend**: Deployed on Vercel.
- **Frontend**: Deployed on Vercel.
- **Database**: MongoDB Atlas.
- **Image Storage**: Cloudinary.
- **Payment Processing**: Stripe.

## Security

- JWT Authentication
- Admin role-based authorization
- Protected API routes
- Environment variables for sensitive keys
- MongoDB Atlas security & CORS isolation
- Cloudinary secure credential management

## Testing Checklist

### Authentication
- [x] Customer Registration
- [x] Customer Login
- [x] Admin Login

### Products
- [x] Create Product
- [x] View Product
- [x] Update Product
- [x] Delete Product
- [x] Product Image Upload (Cloudinary)

### Shopping
- [x] Cart Management
- [x] Wishlist Management
- [x] Saved Addresses
- [x] Delivery Options

### Payments
- [x] Stripe Checkout
- [x] Cash on Delivery (COD)

### Orders
- [x] Create Order
- [x] Order History
- [x] Admin Order Management

### Deployment
- [x] MongoDB Atlas Connection
- [x] Cloudinary Integration
- [x] Vercel Serverless API
- [x] Production API Endpoints
- [x] Production Checkout Flow
