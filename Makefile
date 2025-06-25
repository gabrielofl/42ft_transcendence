NAME = ft_transcendence

up:
	docker-compose up --build

down:
	docker-compose down

re: fclean up

clean:
	docker-compose down

fclean:
	docker-compose down -v --remove-orphans

nuke:
	docker system prune -a --volumes -f
