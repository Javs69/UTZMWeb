-- Tablas empleadas en la base de datos UTZM extraidas de backend/backup.sql

CREATE TABLE public.answers (
    id integer NOT NULL,
    question_id integer NOT NULL,
    seller_id integer NOT NULL,
    text text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.categories (
    id bigint NOT NULL,
    name text NOT NULL
);

CREATE TABLE public.order_items (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    product_id bigint NOT NULL,
    name text NOT NULL,
    price_cents integer NOT NULL,
    qty integer NOT NULL,
    CONSTRAINT order_items_qty_check CHECK ((qty > 0))
);

CREATE TABLE public.orders (
    id bigint NOT NULL,
    buyer_id bigint NOT NULL,
    seller_id bigint NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    total_cents integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'delivered'::text, 'cancelled'::text]))),
    CONSTRAINT orders_total_cents_check CHECK ((total_cents >= 0))
);

CREATE TABLE public.payment_methods (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    type text NOT NULL,
    label text,
    last4 text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.payments (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    payment_method_id bigint,
    amount_cents integer NOT NULL,
    status text NOT NULL,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT payments_amount_cents_check CHECK ((amount_cents >= 0)),
    CONSTRAINT payments_status_check CHECK ((status = ANY (ARRAY['captured'::text, 'failed'::text, 'refunded'::text])))
);

CREATE TABLE public.product_images (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    url text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);

CREATE TABLE public.products (
    id bigint NOT NULL,
    seller_id bigint NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    price_cents integer NOT NULL,
    stock integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    category_id bigint,
    CONSTRAINT products_price_cents_check CHECK ((price_cents >= 0)),
    CONSTRAINT products_stock_check CHECK ((stock >= 0))
);

CREATE TABLE public.questions (
    id integer NOT NULL,
    product_id integer NOT NULL,
    user_id integer NOT NULL,
    text text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.users (
    id bigint NOT NULL,
    full_name text NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    avatar_url text
);
