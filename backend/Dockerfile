FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY . .
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Tashkent

WORKDIR /app
COPY --from=builder /app/server .

RUN mkdir -p /app/uploads

EXPOSE 8080

CMD ["./server"]
