import enum


class AlertFieldType(enum.Enum):
    text = "text"
    number = "number"
    boolean = "boolean"
    list = "list"


class AlertOperator(enum.Enum):
    eq = "=="
    ne = "!="
    in_ = "in"
    not_in = "not in"
    lt = "<"
    gt = ">"
    lte = "<="
    gte = ">="
    contains = "contains"
    not_contains = "not contains"
    contains_any = "contains any"
    contains_all = "contains all"
    is_empty = "is empty"
