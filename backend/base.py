# backend/base.py
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.schema import MetaData
 
# Define a custom metadata instance to avoid table redefinition issues
metadata = MetaData()
 
# Create the declarative base with the custom metadata
Base = declarative_base(metadata=metadata)
 