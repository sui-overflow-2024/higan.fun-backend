export const toPascalCase: (str: string) => string = (str) => {
    const m = str.match(/[a-z]+/gi)
    if (!m) return ""
    return m.map(function (word) {
        return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
    })
        .join("");
}

export const toSnakeCase: (str: string) => string = (str) => {
    const res = str.replaceAll(" ", "_").toLowerCase()
    return str.replaceAll(" ", "_").toLowerCase()
}
export const toSnakeCaseUpper: (str: string) => string = (str) => {
    return str.replaceAll(" ", "_").toUpperCase()
}
