from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.crud import product as product_crud
from app.schemas.product import ProductListResponse, ProductResponse

router = APIRouter()


@router.get("", response_model=ProductListResponse)
async def list_products(db: AsyncSession = Depends(get_db)) -> ProductListResponse:
    products = await product_crud.list_all(db)
    return ProductListResponse(
        products=[ProductResponse(id=p.id, name=p.name) for p in products]
    )
