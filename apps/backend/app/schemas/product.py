from pydantic import BaseModel


class ProductResponse(BaseModel):
    id: int
    name: str


class ProductListResponse(BaseModel):
    products: list[ProductResponse]
