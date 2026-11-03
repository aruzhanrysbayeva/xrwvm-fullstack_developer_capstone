FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py ./
COPY sentiment ./sentiment
RUN useradd --create-home app
USER app
ENV HOST=0.0.0.0 PORT=5050
EXPOSE 5050
CMD ["python", "app.py"]
